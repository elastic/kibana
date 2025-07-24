/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/api_integration/config')
  );
  const xPackAPITestsConfig = await readConfigFile(
    require.resolve('../../api_integration/config.ts')
  );

  const readOnlyObjectsPlugin = resolve(
    __dirname,
    '../common/plugins/read_only_objects_test_plugin'
  );

  return {
    testFiles: [resolve(__dirname, './apis/spaces/read_only_objects.ts')],
    services: {
      ...kibanaAPITestsConfig.get('services'),
      ...xPackAPITestsConfig.get('services'),
    },
    servers: xPackAPITestsConfig.get('servers'),
    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
        'xpack.security.authc.token.enabled=true',
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${readOnlyObjectsPlugin}`,
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic1: { order: 0 } },
        })}`,
      ],
    },
    security: {
      ...xPackAPITestsConfig.get('security'),
      roles: {
        ...xPackAPITestsConfig.get('security.roles'),
        kibana_savedobjects_editor: {
          kibana: [
            {
              base: [],
              feature: {
                savedObjects: ['all'],
                dev_tools: ['all'],
                savedObjectsManagement: ['all'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: {
            cluster: ['monitor'],
            indices: [
              {
                names: ['.kibana*'],
                privileges: ['read', 'write', 'create', 'delete', 'view_index_metadata'],
              },
            ],
          },
        },
      },
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Read Only Saved Objects)',
    },
  };
}
