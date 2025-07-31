/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext, getKibanaCliLoggers } from '@kbn/test';
import { RemoteEsArchiverProvider } from './services/remote_es/remote_es_archiver';
import { RemoteEsProvider } from './services/remote_es/remote_es';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../api_integration/config.ts')
  );

  return {
    ...xpackFunctionalConfig.getAll(),
    testFiles: [resolve(__dirname, './apps/fleet/sync_integrations_flow')],
    junit: {
      reportName: 'X-Pack Fleet Multi Cluster Tests',
    },
    services: {
      ...xpackFunctionalConfig.get('services'),
      remoteEs: RemoteEsProvider,
      remoteEsArchiver: RemoteEsArchiverProvider,
    },
    apps: {
      ...xpackFunctionalConfig.get('apps'),
      ['fleet']: {
        pathname: '/app/fleet',
      },
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.fleet.syncIntegrations.taskInterval=5s`,
        `--logging.loggers=${JSON.stringify([
          ...getKibanaCliLoggers(xpackFunctionalConfig.get('kbnTestServer.serverArgs')),

          // Enable debug fleet logs by default
          {
            name: 'plugins.fleet',
            level: 'debug',
            appenders: ['default'],
          },
        ])}`,
      ],
      startRemoteKibana: true,
    },
    security: {
      ...xpackFunctionalConfig.get('security'),
      remoteEsRoles: {
        ccs_remote_search: {
          cluster: ['manage', 'manage_ccr'],
          indices: [
            {
              names: ['*'],
              privileges: ['read', 'view_index_metadata', 'read_cross_cluster', 'monitor'],
            },
          ],
        },
      },
      defaultRoles: [
        ...(xpackFunctionalConfig.get('security.defaultRoles') ?? []),
        'ccs_remote_search',
      ],
    },
    esTestCluster: {
      ...xpackFunctionalConfig.get('esTestCluster'),
      ccs: {
        remoteClusterUrl:
          process.env.REMOTE_CLUSTER_URL ??
          'http://elastic:changeme@localhost:' +
            `${xpackFunctionalConfig.get('servers.elasticsearch.port') + 1}`,
      },
      serverArgs: ['xpack.ml.enabled=false'],
      license: 'trial',
    },
  };
}
