var fs = require('fs');

try {
	var Discord = require("discord.js");
} catch (e) {
	console.log(e.stack);
	console.log(process.version);
	console.log("Please run npm install and ensure it passes with no errors! ~alph");
	process.exit();
}

console.log("Starting DiscordBot\nNode Version: " + process.version + "\nDiscord.js verseion: " + Discord.version);

try {
	var AuthDetails = require("./auth.json");
} catch (e) { 
	console.log("Please create an auth.json like auth.json.example with a bot token or an email and password.\n"+e.stack);
	process.exit();
}	

var dangerousCommands = ["eval","pullanddeploy","setUsername"];
var Permissions = {};
try{
	Permissions = require("./permissions.json");
} catch(e){
	Permissions.global = {};
	Permissions.users = {};
}
// Set all dangerous commands to false for global users if they weren't already
for(var i=0; i<dangerousCommands.length; i++){
	var cmd = dangerousCommands[i];
	if(!Permissions.global.hasOwnProperty(cmd)){
		Permissions.global[cmd] = false;
	}
}

Permissions.checkPermission = function(user, permission){
	try{
		var allowed = true;
		try{
			if(Permissions.global.hasOwnProperty(permission)){
				allowed = Permissions.global[permission] === true;
			}
		} catch(e){}
		try{
			if(Permissions.users[user.id].hasOwnProperty(permission)){
				allowed = Permissions.users[user.id][permission] === true;
			}
		} catch(e){}
		return allowed;
	} catch(e){}
	return false;
}


var Config = {};
try {
	Config = require("./config.json");
} catch (e) {
	Config.debug = false;
	Config.commandPrefix = '!';
	try {
		if (fs.lstatSync("./config.json").isFile()){
			console.log("WARNING: config.json found but we could not read it!\n" + e.stack);
		}
	} catch (e2) {
		fs.writeFile("./config.json",JSON.stringify(Config,null,2));
	}
}
if(!Config.hasOwnProperty("commandPrefix")){
	Config.commandPrefix = '!';
}

var Counts = {};
try{
	Counts = require("./counts.json");
} catch(e){
	Counts.counts = {};
}

var d20 = require("d20");

var startTime = Date.now();

var aliases;

var commands = {

	"alias": {
		usage: "<name> <actual command>",
		description: "Creates command aliases. Useful for making simple commands on the fly",
		process: function(bot,msg,suffix) {
			var args = suffix.split(" ");
			var name = args.shift();
			if(!name){
				msg.channel.sendMessage(Config.commandPrefix + "alias " + this.usage + "\n" + this.description);
			} else if(commands[name] || name === "help"){
				msg.channel.sendMessage("overwriting commands with aliases is not allowed!");
			} else {
				var command = args.shift();
				aliases[name] = [command, args.join(" ")];
				//now save the new alias
				require("fs").writeFile("./alias.json",JSON.stringify(aliases,null,2), null);
				msg.channel.sendMessage("created alias " + name);
			}
		}
	},
	"aliases": {
		description: "lists all recorded aliases",
		process: function(bot, msg, suffix) {
			var text = "current aliases:\n";
			for(var a in aliases){
				if(typeof a === 'string')
					text += a + " ";
			}
			msg.channel.sendMessage(text);
		}
	},
	"announce": {
		usage: "<message>",
		description: "bot says message with text to speech",
		process: function(bot,msg,suffix){
			msg.channel.sendMessage(suffix,{tts:true});
		}
	},
	"counts": {
		description: "lists the current count for all tracked stats",
		process: function(bot,msg,suffix){
			var text = "Current counts:\n-------------------\n";
			for(var c in Counts.counts){
				text += c + " : " + Counts.counts[c] + "\n";
			}
			msg.channel.sendMessage(text);
		}
	},
	"hunger": {
		description: "increments the count of 'Im Hungry' by 1",
		process: function(bot, msg, suffix){
			var curCnt = Counts.counts["I'm Hungry"];
			Counts.counts["I'm Hungry"] = curCnt + 1;

			fs.writeFile("./counts.json",JSON.stringify(Counts,null,2));			

			var text = "Adding 1 to the current count for \"I'm Hungry\".\nNew Total: " + (curCnt+1);
			msg.channel.sendMessage(text);
		}
	},
	"idle": {
		usage: "[status]",
		description: "sets bot status to idle",
		process: function(bot,msg,suffix){
			bot.user.setStatus("idle",suffix);
		}
	},
	"log": {
		usage: "<log message>",
		description: "logs message to bot console",
		process: function(bot,msg,suffix){
			console.log(msg.content);
		}
	},
	"meow": {
		description: "meow",
		process: function(bot, msg, suffix){
			msg.channel.sendMessage("Meow",{tts:true});
			msg.channel.sendMessage("ヾ(*ΦωΦ)ﾉ");
		}
	},
	"myid": {
		description: "returns the user id of the sender",
		process: function(bot,msg){
			msg.channel.sendMessage(msg.author.id);
		}
	},
	"online": {
		usage: "[status]",
		description: "sets bot status to online",
		process: function(bot,msg,suffix){
			bot.user.setStatus("online",suffix);
		}
	},
	"ping": {
		description: "pong. Check if the bot is still alive",
		process: function(bot, msg, suffix) {
			msg.channel.sendMessage(msg.author+" pong");
			if(suffix) {
				msg.channel.sendMessage("note that ~ping takes no arguments!");
			}
		}
	},
	"roll": {
		usage: "[# of sides] or [# of dice]d[# of sides]( + [# of dice]d[# of sides] + ...)",
		description: "roll one die with x sides, or multiple dice using d20 syntax. Default value is 10",
		process: function(bot,msg,suffix) {
			if (suffix.split("d").length <= 1) {
				msg.channel.sendMessage(msg.author + " rolled a " + d20.roll(suffix || "10"));
			}
			else if (suffix.split("d").length > 1) {
				var eachDie = suffix.split("+");
				var passing = 0;
				for (var i = 0; i < eachDie.length; i++){
					if (eachDie[i].split("d")[0] < 50) {
						passing += 1;
					};
				}
				if (passing == eachDie.length) {
					msg.channel.sendMessage(msg.author + " rolled a " + d20.roll(suffix));
				}  else {
					msg.channel.sendMessage(msg.author + " tried to roll too many dice at once!");
				}
			}
		}
	},

	"say": {
		usage: "<message>",
		description: "bot says message",
		process: function(bot,msg,suffix){
			msg.channel.sendMessage(suffix);
		}
	},
	"uptime": {
		usage: "",
		description: "returns how long the bot has been up and running for",
		process: function(bot, msg, suffix) {
			var curTime = Date.now();
			var msec = curTime - startTime;
			console.log("Uptime is " + msec + " milliseconds");
			var days = Math.floor(msec / 1000 / 60 / 60 / 24);
			msec -= days * 1000 * 60 * 60 * 24;
			var hours = Math.floor(msec / 1000 / 60 / 60);
			msec -= hours * 1000 * 60 * 60;
			var mins = Math.floor(msec / 1000 / 60);
			msec -= mins * 1000 * 60;
			var secs = Math.floor(msec / 1000);
			var timestr = "";
			if(days > 0) {
				timestr += days + " days ";
			}
			if(hours > 0) {
				timestr += hours + " hours ";
			}
			if(mins > 0) {
				timestr += mins + " minutes ";
			}
			if(secs > 0) {
				timestr += secs + " seconds ";
			}
			msg.channel.sendMessage("**Uptime**: " + timestr);
		}
	},
	"userid": {
		usage: "[user to get id of]",
		description: "Returns the unique id of a user. This is useful for permissions.",
		process: function(bot,msg,suffix) {
			if(suffix){
				var users = msg.channel.guild.members.filter((member) => member.user.username == suffix).array();
				if(users.length == 1){
					msg.channel.sendMessage( "The id of " + users[0].user.username + " is " + users[0].user.id)
				} else if(users.length > 1){
					var response = "multiple users found:";
					for(var i=0;i<users.length;i++){
						var user = users[i];
						response += "\nThe id of <@" + user.id + "> is " + user.id;
					}
					msg.channel.sendMessage(response);
				} else {
					msg.channel.sendMessage("No user " + suffix + " found!");
				}
			} else {
				msg.channel.sendMessage( "The id of " + msg.author + " is " + msg.author.id);
			}
		}
	}
}

if(AuthDetails.hasOwnProperty("client_id")){
	commands["invite"] = {
		description: "generates invite link you can use to invite the bot to your server",
		process: function(bot, msg, suffix) {
			msg.channel.sendMessage("invite link: https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=470019135");
		}
	}
}

try{
	aliases = require("./alias.json");
} catch(e) {
	aliases = {};
}

var bot = new Discord.Client();
	
bot.on("ready", function () {
	console.log("Logged in! Serving in " + bot.guilds.array().length + " servers");
	//require("./plugins.js").init();
	console.log("type " + Config.commandPrefix + "help in Discord for a commands list.");
	bot.user.setStatus("online", Config.commandPrefix + "help");
});

bot.on("disconnected", function() {
	console.log("Disconnected!");
	process.exit(1);
});


function checkMessageForCommand(msg, isEdit) {
	//check if message is a command
	if(msg.author.id != bot.user.id && (msg.content[0] === Config.commandPrefix)){
		console.log("treating " + msg.content + " from " + msg.author + " as command");
		var cmdTxt = msg.content.split(" ")[0].substring(1);
        	var suffix = msg.content.substring(cmdTxt.length+2);//add one for the ! and one for the space
		if(msg.isMentioned(bot.user)){
			try {
				cmdTxt = msg.content.split(" ")[1];
				suffix = msg.content.substring(bot.user.mention().length+cmdTxt.length+2);
			} catch(e){ //no command
				msg.channel.sendMessage("Yes?");
				return;
			}
		}
		alias = aliases[cmdTxt];
		if(alias){
			console.log(cmdTxt + " is an alias, constructed command is " + alias.join(" ") + " " + suffix);
			cmdTxt = alias[0];
			suffix = alias[1] + " " + suffix;
		}
		var cmd = commands[cmdTxt];
        	if(cmdTxt === "help"){
			//help is special since it iterates over the other commands
			if(suffix){
				var cmds = suffix.split(" ").filter(function(cmd){return commands[cmd]});
				var info = "";
				for(var i=0;i<cmds.length;i++) {
					var cmd = cmds[i];
					info += "**"+Config.commandPrefix + cmd+"**";
					var usage = commands[cmd].usage;
					if(usage){
						info += " " + usage;
					}
					var description = commands[cmd].description;
					if(description instanceof Function){
						description = description();
					}
					if(description){
						info += "\n\t" + description;
					}
					info += "\n"
				}
				msg.channel.sendMessage(info);
			} else {
				msg.author.sendMessage("**Available Commands:**").then(function(){
					var batch = "";
					var sortedCommands = Object.keys(commands).sort();
					for(var i in sortedCommands) {
						var cmd = sortedCommands[i];
						var info = "**"+Config.commandPrefix + cmd+"**";
						var usage = commands[cmd].usage;
						if(usage){
							info += " " + usage;
						}
						var description = commands[cmd].description;
						if(description instanceof Function){
							description = description();
						}
						if(description){
							info += "\n\t" + description;
						}
						var newBatch = batch + "\n" + info;
						if(newBatch.length > (1024 - 8)){ //limit message length
							msg.author.sendMessage(batch);
							batch = info;
						} else {
							batch = newBatch
						}
					}
					if(batch.length > 0){
						msg.author.sendMessage(batch);
					}
				});
			}
		}
		else if(cmd) {
			if(Permissions.checkPermission(msg.author,cmdTxt)){
				try{
					cmd.process(bot,msg,suffix,isEdit);
				} catch(e){
					var msgTxt = "command " + cmdTxt + " failed :(";
					if(Config.debug){
						 msgTxt += "\n" + e.stack;
					}
					msg.channel.sendMessage(msgTxt);
				}
			} else {
				msg.channel.sendMessage("You are not allowed to run " + cmdTxt + "!");
			}
		} else {
			msg.channel.sendMessage(cmdTxt + " not recognized as a command!").then((message => message.delete(5000)))
		}
	} else {
		//message isn't a command or is from us
		//drop our own messages to prevent feedback loops
		if(msg.author == bot.user){
			return;
		}

		if (msg.author != bot.user && msg.isMentioned(bot.user)) {
			msg.channel.sendMessage(msg.author + ", you called?");
		} else {

		}
	}
}

bot.on("message", (msg) => checkMessageForCommand(msg, false));
bot.on("messageUpdate", (oldMessage, newMessage) => {
	checkMessageForCommand(newMessage, true);
});

/*bot.on("presence", function(user, status, gameId) {
	console.log(user + " went " + status);

	try {
		if (status != 'offline'){
			if (messagebox.hasOwnProperty(user.id)){
				console.log("found message for " + user.id);
				var message = messagebox[user.id];
				var channel = bot.channels.get("id", message.channel);
				delete messagebox[user.id];
				updateMessagebox();
				bot.sendMessage(channel, message.content);
			}
		}	
	} catch (e) {}
});*/

exports.addCommand = function(commandName, commandObject) {
	try {
		commands[commandName] = commandObject;
	} catch (e) {
		console.log(e);
	}
}

exports.commandCount = function() {
	return Object.keys(commands).length;
}

if(AuthDetails.bot_token){
	console.log("logging in with token");
	bot.login(AuthDetails.bot_token);
} else {
	console.log("logging in as a user account. Consider switching to an official bot account instead!");
	bot.login(AuthDetails.email, AuthDeatils.password);
}



