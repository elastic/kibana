/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('./rules_list'), require.resolve('./rules_page')],
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Triggers Actions UI',
    },
  };
}
