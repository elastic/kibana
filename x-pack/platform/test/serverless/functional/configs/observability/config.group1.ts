/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseTestConfig = await readConfigFile(require.resolve('../../config.oblt.base.ts'));

  return {
    ...baseTestConfig.getAll(),
    testFiles: [
      require.resolve('../../test_suites/home_page'),
      require.resolve('../../test_suites/management'),
      require.resolve('../../test_suites/dev_tools'),
      require.resolve('../../test_suites/platform_security'),
      require.resolve('../../test_suites/reporting'),
      require.resolve('../../test_suites/grok_debugger'),
      require.resolve('../../test_suites/console'),
      require.resolve('../../test_suites/painless_lab'),
      require.resolve('../../test_suites/spaces'),
      require.resolve('../../test_suites/data_usage'),
    ],
    junit: {
      reportName: 'Serverless Observability Functional Tests - Common Group 1',
    },
  };
}
