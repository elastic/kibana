/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const fs = require('fs');
const os = require('os');
const process = require('process');
const spawn = require('child_process').spawn;
/* eslint-disable no-process-exit */
const MUST_RUN_FROM_DIR = 'kibana';
const OUTPUT_DIR = 'target';
const OUTPUT_FILE = `${OUTPUT_DIR}/loop-cypress-tests.txt`;
const createOutputDir = () => {
  fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
    if (err) throw err;
  });
};
const showUsage = () => {
  const scriptName = process.argv[1].slice(process.argv[1].lastIndexOf('/') + 1);
  console.log(`\nUsage: ${scriptName} <times-to-run>`, `\nExample: ${scriptName} 5`);
};

const exitIfIncorrectWorkingDir = () => {
  if (!process.cwd().endsWith(`/${MUST_RUN_FROM_DIR}`)) {
    console.error(
      `\nERROR: This script must be run from the '${MUST_RUN_FROM_DIR}' directory, but it was ran from '${process.cwd()}' instead.`
    );
    showUsage();
    process.exit(1);
  }
};
const exitIfTimesToRunIsInvalid = (timesToRun) => {
  if (!timesToRun > 0) {
    console.error(
      '\nERROR: You must specify a valid number of times to run the SIEM Cypress tests.'
    );
    showUsage();
    process.exit(1);
  }
};
const spawnChild = async () => {
  const child = spawn('node', [
    'scripts/functional_tests',
    '--config',
    'x-pack/test/security_solution_cypress/config.ts',
  ]);
  for await (const chunk of child.stdout) {
    console.log(chunk.toString());
    fs.appendFileSync(OUTPUT_FILE, chunk.toString());
  }
  for await (const chunk of child.stderr) {
    console.log(chunk.toString());
    fs.appendFileSync(OUTPUT_FILE, chunk.toString());
  }
  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });
  return exitCode;
};

const runNTimes = async (timesToRun) => {
  for (let i = 0; i < timesToRun; i++) {
    const startingRun = `\n\n*** Starting test run ${
      i + 1
    } of ${timesToRun} on host ${os.hostname()} at ${new Date()} ***\n\n`;
    console.log(startingRun);
    fs.appendFileSync(OUTPUT_FILE, startingRun);
    const exitCode = await spawnChild();
    const testRunCompleted = `\n\n*** Test run ${
      i + 1
    } of ${timesToRun} on host ${os.hostname()} exited with code ${exitCode} at ${new Date()} ***`;
    console.log(testRunCompleted);
    fs.appendFileSync(OUTPUT_FILE, testRunCompleted);
  }
};

const timesToRun = Number(process.argv[2]) || 0;
exitIfIncorrectWorkingDir();
exitIfTimesToRunIsInvalid(timesToRun);
console.log(`\nCypress tests will be run ${timesToRun} times`);
console.log(`\nTest output will be appended to '${OUTPUT_FILE}'`);
createOutputDir();
runNTimes(timesToRun);
