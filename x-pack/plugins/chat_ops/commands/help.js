/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import commands from './index';

export default (server) => ({
  help: 'Get a list of commands, or help for a command',
  example: 'who',
  fn: args => {
    const commandName = args.trim();
    const command = commands[commandName];
    if (!command)
    {return `My commands are: ${Object.keys(commands)
      .map(command => `*${command}*`)
      .sort()
      .join(
        ', '
      )}. For more information on a function, try something like: \`@${server.config().get('xpack.chatops.chatname')} help random\``;}

    return `${commandName}: ${command().help}. For example: \`@${server.config().get('xpack.chatops.chatname')} ${commandName} ${
      command().example
    }\``;
  },
});
