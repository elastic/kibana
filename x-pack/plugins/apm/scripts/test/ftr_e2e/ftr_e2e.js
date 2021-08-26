/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const yargs = require('yargs');
const childProcess = require('child_process');
const path = require('path');

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
  .option('open', {
    default: false,
    type: 'boolean',
    description: 'Opens the Cypress Test Runner',
  })
  .help();

const { basic, trial, server, runner } = argv;

if (basic && trial) {
  console.error('Error: Only one license should be provided');
  process.exit();
}

const license = trial ? 'trial' : 'basic';
console.log(`License: ${license}`);

const testDir = path.join(__dirname, '../../../ftr_e2e');

let testScript = 'functional_tests';

if (server) {
  testScript = 'functional_tests_server';
} else if (runner) {
  testScript = 'functional_test_runner';
}

childProcess.execSync(
  `node ./../../../scripts/${testScript} --config ./cypress_run.ts`,
  {
    cwd: testDir,
    stdio: 'inherit',
  }
);
