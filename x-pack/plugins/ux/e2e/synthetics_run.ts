/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';
import { argv } from './helpers/parse_args_params';
import { SyntheticsRunner } from './helpers/synthetics_runner';

const { headless, grep, bail: pauseOnError } = argv;

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(
    require.resolve('@kbn/synthetics-plugin/e2e/config')
  );

  return {
    ...kibanaConfig.getAll(),
    testRunner: async ({ getService }: any) => {
      const syntheticsRunner = new SyntheticsRunner(getService, {
        headless,
        match: grep,
        pauseOnError,
      });

      await syntheticsRunner.setup();

      const fixturesDir = path.join(__dirname, '../e2e/fixtures/');

      await syntheticsRunner.loadTestData(fixturesDir, [
        'rum_8.0.0',
        'rum_test_data',
      ]);
      await syntheticsRunner.loadTestFiles(async () => {
        require('./journeys');
      });
      await syntheticsRunner.run();
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
