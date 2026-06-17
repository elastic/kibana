/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/user_profiles/security_disabled')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services,
    junit: {
      reportName: 'X-Pack Security API Integration Tests (User Profiles - Security Disabled)',
    },
    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig
          .get('esTestCluster.serverArgs')
          .filter((arg: string) => !arg.startsWith('xpack.security')),
        'xpack.security.enabled=false',
      ],
    },
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.includes('xpack.security')),
      ],
    },
  };
}
