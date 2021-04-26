/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { run } from '@elastic/synthetics';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { FtrProviderContext } from './ftr_provider_context';

import './journeys';

// eslint-disable-next-line no-console
const log = console.log;

export async function runTests({ getService }: FtrProviderContext) {
  await startRunner(getService, run);
}

async function startRunner(
  getService: FtrProviderContext['getService'],
  runnerExecution: typeof run
) {
  await runnerExecution({ journeyName: 'uptime', headless: true, sandbox: false });
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

async function waitForKibana() {
  log('Waiting for kibana server to start');

  log(
    chalk.blueBright('Use node scripts/start_e2e_server.js in uptime dir to start kibana server')
  );

  let kbnStatus = false;

  while (!kbnStatus) {
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
      const { data } = await axios.get('http://kibana_system:changeme@localhost:5620/api/status');
      kbnStatus = data?.status.overall.state === 'green';
    } catch (e) {
      log(chalk.yellowBright('retying, waiting for kibana'));
    }
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

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const ftrConfig = await readConfigFile(require.resolve('./config.ts'));

  await waitForES();

  changePassword();
  await waitForHeartbeatData();

  await waitForKibana();
  return {
    ...ftrConfig.getAll(),
    testRunner: runTests,
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
