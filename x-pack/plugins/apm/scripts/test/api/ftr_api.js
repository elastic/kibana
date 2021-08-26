/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const { argv } = require('yargs');
const childProcess = require('child_process');
const path = require('path');

const { basic, trial, server, runner, helper } = argv;

//TODO: check how to use --help instead
if (helper) {
  console.log(`
    node ftr_api.js [--basic | --trial] [--server] [--runner]

    Arguments:
    --basic: Run tests with basic license
    --trial: Run tests with trial license
    --server: Start an instance of Elasticsearch
    --runner: Run all tests (an instance of Elasticsearch needs to be available)
  `);
  process.exit();
}

if (basic && trial) {
  console.error('Error: Only one license should be provided');
  process.exit();
}

const license = trial ? 'trial' : 'basic';
console.log(`License: ${license}`);

const testDit = path.join(__dirname);

const configArg = `--config ../../../../../test/apm_api_integration/${license}/config.ts`;

if (server) {
  childProcess.execSync(
    `node ../../../../../scripts/functional_tests_server ${configArg}`,
    { cwd: testDit, stdio: 'inherit' }
  );
  process.exit();
}

if (runner) {
  childProcess.execSync(
    `node ../../../../../scripts/functional_test_runner ${configArg}`,
    { cwd: testDit, stdio: 'inherit' }
  );
  process.exit();
}

childProcess.execSync(
  `node ../../../../../scripts/functional_tests ${configArg}`,
  { cwd: testDit, stdio: 'inherit' }
);
