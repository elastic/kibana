/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const yargs = require('yargs');
const path = require('path');
const childProcess = require('child_process');

const { argv } = yargs(process.argv.slice(2))
  .option('basic', {
    default: true,
    type: 'boolean',
    description: 'Run tests with basic license',
  })
  .option('trial', {
    default: false,
    type: 'boolean',
    description: 'Run tests with trial license',
  })
  .option('server', {
    default: false,
    type: 'boolean',
    description: 'Start Elasticsearch and kibana',
  })
  .option('runner', {
    default: false,
    type: 'boolean',
    description:
      'Run all tests (an instance of Elasticsearch and kibana are needs to be available)',
  })
  .option('grep', {
    alias: 'spec',
    default: false,
    type: 'string',
    description: 'Specify the spec files to run',
  })
  .help();

const { trial, server, runner, grep } = argv;

const license = trial ? 'trial' : 'basic';
console.log(`License: ${license}`);

let ftrScript = 'functional_tests';
if (server) {
  ftrScript = 'functional_tests_server';
} else if (runner) {
  ftrScript = 'functional_test_runner';
}

const grepArg = grep ? `--grep "${grep}"` : '';
const cmd = `node ../../../../scripts/${ftrScript} ${grepArg} --config ../../../../test/apm_api_integration/${license}/config.ts`;

console.log(`Running ${cmd}`);

childProcess.execSync(cmd, { cwd: path.join(__dirname), stdio: 'inherit' });
