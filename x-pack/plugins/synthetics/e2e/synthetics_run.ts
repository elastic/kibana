/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';
import { argv } from '@kbn/observability-plugin/e2e/parse_args_params';
import { SyntheticsRunner } from '@kbn/observability-plugin/e2e/synthetics_runner';
import { FtrProviderContext } from '../../../test/functional_with_es_ssl/ftr_provider_context';

const { headless, grep, bail: pauseOnError } = argv;

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...kibanaConfig.getAll(),
    testRunner: async ({ getService }: FtrProviderContext) => {
      const syntheticsRunner = new SyntheticsRunner(getService, {
        headless,
        match: grep,
        pauseOnError,
      });

      await syntheticsRunner.setup();
      const fixturesDir = path.join(__dirname, '../e2e/fixtures/es_archiver/');

      await syntheticsRunner.loadTestData(fixturesDir, ['full_heartbeat', 'browser']);

      await syntheticsRunner.loadTestFiles(async () => {
        require('./journeys');
      });

      await syntheticsRunner.run();
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
