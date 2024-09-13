/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { SyntheticsRunner, argv } from '@kbn/synthetics-e2e';

const { headless, grep, bail: pauseOnError } = argv;

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('@kbn/synthetics-e2e/config'));
  return {
    ...kibanaConfig.getAll(),
    testRunner: async ({ getService }: any) => {
      const syntheticsRunner = new SyntheticsRunner(getService, {
        headless,
        match: grep,
        pauseOnError,
      });

      await syntheticsRunner.setup();

      await syntheticsRunner.loadTestFiles(async () => {
        require('./journeys');
      });

      await syntheticsRunner.run();
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
