/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));

  return {
    ...baseFleetApiConfig.getAll(),
    testFiles: [require.resolve('./apis/tasks')],
    junit: {
      reportName: 'X-Pack Tasks API Integration Tests',
    },
    kbnTestServer: {
      ...baseFleetApiConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseFleetApiConfig.get('kbnTestServer.serverArgs'),
        `--xpack.fleet.enableExperimental=${JSON.stringify(['enablePackageRollback'])}`,
        `--xpack.fleet.cleanupIntegrationRevisions.taskInterval=30s`,
        `--xpack.fleet.integrationRollbackTTL=10s`,
      ],
    },
  };
}
