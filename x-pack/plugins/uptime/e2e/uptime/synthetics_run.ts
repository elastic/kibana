/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';
import { argv } from '../helpers/parse_args_params';
import { SyntheticsRunner } from '../helpers/synthetics_runner';

const { headless, grep, bail: pauseOnError } = argv;

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('../config.ts'));
  return {
    ...kibanaConfig.getAll(),
    testRunner: async ({ getService }: any) => {
      const syntheticsRunner = new SyntheticsRunner(getService, {
        headless,
        match: grep,
        pauseOnError,
      });

      await syntheticsRunner.setup();
      const fixturesDir = path.join(__dirname, '../fixtures/es_archiver/');

      await syntheticsRunner.loadTestData(fixturesDir, [
        'synthetics_data',
        'full_heartbeat',
        'browser',
      ]);

      await syntheticsRunner.loadTestFiles(async (reload) => {
        if (reload) {
          const dirPath = require.resolve('./journeys').replace('index.ts', '');
          Object.keys(require.cache).forEach(function (key) {
            if (key.startsWith(dirPath)) {
              delete require.cache[key];
            }
          });
        }
        require(path.join(__dirname, './journeys'));
      });

      await syntheticsRunner.run();
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
