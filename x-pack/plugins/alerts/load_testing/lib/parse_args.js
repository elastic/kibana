/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./types').CliArguments } CliArguments */

const pkg = require('../package.json');

const DEFAULT_CONFIG = 'config';
const DEFAULT_MINUTES = 10;

const ENV_CONFIG_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_CONFIG`;
const ENV_MINUTES_NAME = `${pkg.name.toUpperCase().replace(/-/g, '_')}_MINUTES`;

const ENV_CONFIG = process.env[ENV_CONFIG_NAME];
const ENV_MINUTES = parseInt(process.env[ENV_MINUTES_NAME], 10) || undefined;

const help = getHelp();

module.exports = {
  parseArgs,
  help,
};

/** @type { () => CliArguments } */
function parseArgs() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.log(getHelp());
    process.exit(1);
  }

  const [command, ...commandArgs] = argv;

  const config = ENV_CONFIG || DEFAULT_CONFIG;
  const minutes = ENV_MINUTES || DEFAULT_MINUTES;

  return {
    command,
    commandArgs,
    config,
    minutes,
  };
}

function getHelp() {
  return `
${pkg.name}: ${pkg.description}
v${pkg.version}

usage: ${pkg.name} <options> <cmd> <arguments>

commands:
  run <scenarioId> run scenario with specified id
  ls               list suites
  lsv              list suites verbosely
  lsd              list existing deployments, by name and id
  rmd <name>       delete existing deployments match the specified name
  rmdall           delete all existing deployments
  env              print settings given options and env vars

You may also use the following environment variables as the value of the
respective config options:

The following environment variables override default values used:
- ${ENV_CONFIG_NAME}  - ecctl configuration file name   (default: ${DEFAULT_CONFIG})
- ${ENV_MINUTES_NAME} - number of minutes to run        (default: ${DEFAULT_MINUTES})
`.trim();
}
