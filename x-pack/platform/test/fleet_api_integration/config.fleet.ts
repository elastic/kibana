/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));
  const baseConfig = baseFleetApiConfig.getAll();

  return {
    ...baseConfig,
    testFiles: [require.resolve('./apis')],
    junit: {
      reportName: 'X-Pack Fleet API Integration Tests',
    },
    indexRefreshInterval: '1s',
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        // The OAuth2 authentication of the Kafka output is behind a feature flag
        `--feature_flags.overrides.fleet.enableKafkaOAuth2Auth=true`,
      ],
    },
  };
}
