/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));

  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [require.resolve('.')],
    security: { disableTestUser: true },
    esTestCluster: {
      ...baseIntegrationTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...baseIntegrationTestsConfig
          .get('esTestCluster.serverArgs')
          .filter((arg: string) => !arg.startsWith('xpack.security')),
        'xpack.security.enabled=false',
      ],
    },
    kbnTestServer: {
      ...baseIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseIntegrationTestsConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.includes('xpack.security')),
      ],
    },
    junit: {
      reportName: 'X-Pack Streams API Integration Tests - Security Disabled',
    },
  };
}
