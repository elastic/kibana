/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

/**
 * Captures the Isomer fidelity corpus. Runs on demand only (see README.md); it is listed under
 * `disabled` in the FTR manifest so CI never runs it.
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.ts'));

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('./apps')],
    junit: {
      reportName: 'Isomer corpus capture',
    },
    mochaOpts: {
      ...functionalConfig.get('mochaOpts'),
      // One test captures every panel of one dashboard in one theme.
      timeout: 20 * 60 * 1000,
    },
  };
}
