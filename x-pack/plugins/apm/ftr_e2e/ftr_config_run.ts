/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import cypress from 'cypress';
import { cypressStart } from './cypress_start';
import { FtrProviderContext } from './ftr_provider_context';

async function ftrConfigRun({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('./ftr_config.ts'));

  return {
    ...kibanaConfig.getAll(),
    testRunner,
  };
}

async function testRunner({ getService }: FtrProviderContext) {
  const result = await cypressStart(getService, cypress.run);

  if (result && (result.status === 'failed' || result.totalFailed > 0)) {
    throw new Error(`APM Cypress tests failed`);
  }
}

// eslint-disable-next-line import/no-default-export
export default ftrConfigRun;
