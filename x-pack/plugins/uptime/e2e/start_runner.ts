/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { run } from '@elastic/synthetics';
import { FtrProviderContext } from './ftr_provider_context';

import './journeys';

export async function runTests({ getService }: FtrProviderContext) {
  await startRunner(getService, run);
}

async function startRunner(
  getService: FtrProviderContext['getService'],
  runnerExecution: typeof run
) {
  await runnerExecution({ journeyName: 'uptime', headless: false });
}

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const ftrConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...ftrConfig.getAll(),
    testRunner: runTests,
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
