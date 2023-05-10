/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackApiIntegrationTestsConfig = await readConfigFile(
    require.resolve('../../../../test/api_integration/config.ts')
  );

  return {
    services,
    servers: xpackApiIntegrationTestsConfig.get('servers'),
    uiSettings: xpackApiIntegrationTestsConfig.get('uiSettings'),
    kbnTestServer: {
      ...xpackApiIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        '--serverless=es',
      ],
    },
    esTestCluster: {
      ...xpackApiIntegrationTestsConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },
  };
}
