/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
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

async function waitForES() {
  let isEsUp = false;

  log('Waiting for elasticsearch');
  while (!isEsUp) {
    try {
      log(chalk.yellow('retrying after 5 seconds'));

      await new Promise((resolve) => setTimeout(resolve, 5000));
      const status = execSync('curl http://elastic:changeme@localhost:9220/_cluster/health', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      if (status.includes('"status":"green"')) {
        isEsUp = true;

        log(chalk.greenBright('Elasticsearch is up !!'));
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
}

async function waitForHeartbeatData() {
  log(chalk.yellowBright('Waiting for heartbeat to start sending data to ES '));
  let status = false;

  while (!status) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data } = await axios.post(
        'http://elastic:changeme@localhost:9220/heartbeat-*/_search',
        {
          query: {
            bool: {
              filter: [
                {
                  exists: {
                    field: 'summary',
                  },
                },
              ],
            },
          },
        }
      );

      // we want some data in uptime app
      status = data?.hits.total.value >= 2;

      if (status) {
        log(chalk.bold.greenBright('Heartbeat is up and running, found data !!'));
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
}

function changePassword() {
  const esUrl =
    'http://elastic:changeme@localhost:9220/_security/user/kibana_system/_password?pretty';
  execSync(
    `curl -X POST "${esUrl}" -H 'Content-Type: application/json' -d'{ "password" : "changeme"}'`,
    { encoding: 'utf8', stdio: 'pipe' }
  );
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
  await waitForES();

  changePassword();

  await waitForHeartbeatData();

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
