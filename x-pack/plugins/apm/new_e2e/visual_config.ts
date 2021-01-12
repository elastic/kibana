/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

import { APMCypressVisualTestRunner } from './runner';

async function visualConfig({ readConfigFile }: FtrConfigProviderContext) {
  const cypressConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...cypressConfig.getAll(),
    testRunner: APMCypressVisualTestRunner,
  };
}

// eslint-disable-next-line import/no-default-export
export default visualConfig;
