/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseTestConfig = await readConfigFile(require.resolve('../../config.security.base.ts'));
  const kbnTestServer = baseTestConfig.get('kbnTestServer');

  return {
    ...baseTestConfig.getAll(),
    kbnTestServer: {
      ...kbnTestServer,
      serverArgs: [
        ...kbnTestServer.serverArgs,
        // Increase scroll duration for large CSV exports to avoid connection timeouts
        '--xpack.reporting.csv.scroll.duration=5m',
      ],
    },
    testFiles: [
      require.resolve('../../test_suites/discover/embeddable'), // 6 min
      require.resolve('../../test_suites/discover/x_pack'), // 8 min
    ],
    junit: {
      reportName: 'Serverless Security Functional Tests - Common Group 6',
    },
  };
}
