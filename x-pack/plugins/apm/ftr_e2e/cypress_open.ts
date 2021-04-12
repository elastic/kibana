/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { cypressOpenTests } from './cypress_start';

async function openE2ETests({ readConfigFile }: FtrConfigProviderContext) {
  const cypressConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...cypressConfig.getAll(),
    testRunner: cypressOpenTests,
  };
}

// eslint-disable-next-line import/no-default-export
export default openE2ETests;
