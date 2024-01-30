/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import cypress from 'cypress';
import { cypressTestRunner } from './cypress_test_runner';
import { FtrProviderContext } from './ftr_provider_context';

async function ftrConfigRun({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('./ftr_config.ts'));

  return {
    ...kibanaConfig.getAll(),
    testRunner,
  };
}

async function testRunner(ftrProviderContext: FtrProviderContext) {
  const result = await cypressTestRunner({ ftrProviderContext, cypressExecution: cypress.run });

  if (
    result &&
    ((result as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
      (result as CypressCommandLine.CypressRunResult)?.totalFailed)
  ) {
    process.exitCode = 1;
  }
}

// eslint-disable-next-line import/no-default-export
export default ftrConfigRun;
