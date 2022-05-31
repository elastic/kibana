/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import yargs from 'yargs';
import { playwrightStart } from './playwright_start';
import { FtrProviderContext } from './ftr_provider_context';

const { argv } = yargs(process.argv.slice(2))
  .option('headless', {
    default: true,
    type: 'boolean',
    description: 'Start in headless mode',
  })
  .option('grep', {
    default: undefined,
    type: 'string',
    description: 'run only journeys with a name or tags that matches the glob',
  })
  .help();

const { headless, grep } = argv;

async function ftrConfigRun({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...kibanaConfig.getAll(),
    testRunner,
  };
}

async function testRunner({ getService }: FtrProviderContext) {
  const results = await playwrightStart(getService, headless, grep);

  Object.entries(results).forEach(([_journey, result]) => {
    if (result.status !== 'succeeded') {
      throw new Error('APM synthetic tests failed');
    }
  });
}

// eslint-disable-next-line import/no-default-export
export default ftrConfigRun;
