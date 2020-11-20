#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./lib/types').CommandHandler } CommandHandler */

const logger = require('./lib/logger');
const { commands } = require('./lib/commands');
const { parseArgs } = require('./lib/parse_args');

module.exports = {
  main,
};

/** @type { Map<string, CommandHandler> } */
const CommandMap = new Map();
for (const command of commands) {
  CommandMap.set(command.name, command);
}

// @ts-ignore
if (require.main === module) main();

function main() {
  const { config, minutes, command, commandArgs } = parseArgs();
  logger.debug(`cliArguments: ${JSON.stringify({ config, command, commandArgs })}`);

  logger.debug(`using config: ${config}`);

  const commandHandler = CommandMap.get(command || 'help');
  if (commandHandler == null) {
    logger.logErrorAndExit(`command not implemented: "${command}"`);
    return;
  }

  try {
    commandHandler({ config, minutes }, commandArgs);
  } catch (err) {
    logger.logErrorAndExit(`error runninng "${command} ${commandArgs.join(' ')}: ${err}`);
  }
}
