/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import yargs from 'yargs';
import { playwrightRunTests } from './playwright_start';

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

async function runE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...kibanaConfig.getAll(),
    testRunner: playwrightRunTests({ headless, match: grep }),
  };
}

// eslint-disable-next-line import/no-default-export
export default runE2ETests;
