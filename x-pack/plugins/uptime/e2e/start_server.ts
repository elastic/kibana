/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

import { FtrProviderContext } from './ftr_provider_context';

// eslint-disable-next-line no-console
const log = console.log;

const e2eDir = path.join(__dirname, '../e2e');

function checkIfDockerInstalled() {
  let isInstalled = false;
  try {
    execSync('docker -v', { encoding: 'utf8' });
    isInstalled = true;
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return isInstalled;
}

async function waitForDocker() {
  execSync(`STACK_VERSION=8.0.0-SNAPSHOT  docker-compose up -d  --force-recreate`, {
    cwd: e2eDir,
    stdio: 'inherit',
  });
  let isDockerUp = false;

  while (!isDockerUp) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const dockerStatus = execSync('docker ps', { encoding: 'utf8' });

    if (dockerStatus.includes('uptime-e2e-es') && dockerStatus.includes('uptime-e2e-heartbeat')) {
      isDockerUp = true;
    }
  }
}

export async function runTests({}: FtrProviderContext) {
  await new Promise(() => {});
}

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  if (!checkIfDockerInstalled()) {
    // eslint-disable-next-line no-console
    console.error('Docker is required to run e2e tests');
    return;
  }

  await waitForDocker();

  log(chalk.bgGreen(chalk.black('Starting kibana server')));

  const ftrConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...ftrConfig.getAll(),
    testRunner: runTests,
  };
}

process.stdin.resume(); // so the program will not close instantly

function exitHandler(
  options: {
    cleanup?: boolean;
    exit?: boolean;
  },
  exitCode: number
) {
  if (options.cleanup) {
    execSync(`docker-compose stop`);
    execSync(`docker-compose rm -f`);
    process.exit();
  }
  // eslint-disable-next-line no-console
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
