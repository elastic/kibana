/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { createRemoteEsClientForFtrConfig, systemIndicesSuperuser } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./platform.stateful.config.ts'));

  return {
    ...baseConfig.getAll(),

    testFiles: [require.resolve('./platform.streams_ccr.index.ts')],

    junit: {
      reportName: 'Platform Stateful - Streams CCR API Integration Tests',
    },

    esTestCluster: {
      ...baseConfig.get('esTestCluster'),
      ccs: {
        remoteClusterUrl:
          process.env.REMOTE_CLUSTER_URL ??
          `http://elastic:changeme@localhost:${baseConfig.get('servers.elasticsearch.port') + 1}`,
      },
    },

    services: {
      ...baseConfig.get('services'),
      remoteEs: function RemoteEsProvider({
        getService,
      }: {
        getService: (name: string) => unknown;
      }): Client {
        const config = getService('config') as Parameters<
          typeof createRemoteEsClientForFtrConfig
        >[0];
        return createRemoteEsClientForFtrConfig(config, {
          authOverride: systemIndicesSuperuser,
        });
      },
    },
  };
}
