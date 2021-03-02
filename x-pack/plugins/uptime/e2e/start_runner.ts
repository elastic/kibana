/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import chalk from 'chalk';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { run } from '@elastic/synthetics';
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
  await runnerExecution({ journeyName: 'uptime', headless: false });
}
async function waitForKibana() {
  log('Waiting for kibana server to start');

  log(
    chalk.blueBright('Use node scripts/start_e2e_server.js in uptime dir to start kibana server')
  );

  let kbnStatus = false;

  while (!kbnStatus) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const { data } = await axios.get('http://kibana_system:changeme@localhost:5620/api/status');
      kbnStatus = data?.status.overall.state === 'green';
    } catch (e) {
      log(chalk.yellowBright('retying, waiting for kibana'));
    }
  }
}

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const ftrConfig = await readConfigFile(require.resolve('./config.ts'));

  await waitForKibana();
  return {
    ...ftrConfig.getAll(),
    testRunner: runTests,
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
