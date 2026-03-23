/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const testEndpointsPlugin = resolve(__dirname, '../security_functional/plugins/test_endpoints');

  const auditLogPath = resolve(__dirname, './packages/helpers/audit/token.log');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/token')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services,
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Token)',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${testEndpointsPlugin}`,
        '--xpack.security.authc.providers=["token"]',
        '--xpack.security.audit.enabled=true',
        '--xpack.security.audit.appender.type=file',
        `--xpack.security.audit.appender.fileName=${auditLogPath}`,
        '--xpack.security.audit.appender.layout.type=json',
        `--xpack.security.audit.ignore_filters=${JSON.stringify([
          { actions: ['http_request'] },
          { categories: ['database'] },
        ])}`,
      ],
    },
  };
}
