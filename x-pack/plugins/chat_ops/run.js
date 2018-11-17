/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import commands from './commands';
import normalizeOutput from './lib/normalize_output';

export default (str, data, handlers, server) => {
  const name = server.config().get('xpack.chatops.chatname');
  const parts = str.trim().split(' '); // Split by space
  const commandName = parts.shift();
  const commandArgument = parts.join(' ').trim();

  // No command found
  if (commandName === '') {
    throw new Error(`No command entered. Try: \`@${name} help\``);
  }

  const command = commands[commandName];

  // Invalid command
  if (!command) {
    throw new Error(
      `Invalid command "${commandName}". Try: \`@${name} help\``
    );
  }

  return Promise.resolve(command(server).fn(commandArgument, data, handlers)).then(normalizeOutput);
};
