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
  const plugin = resolve(__dirname, './plugins/oidc_provider');
  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');
  const jwksPath = require.resolve('@kbn/security-api-integration-helpers/oidc/jwks.json');

  const testEndpointsPlugin = resolve(__dirname, '../security_functional/plugins/test_endpoints');

  const auditLogPath = resolve(__dirname, './packages/helpers/audit/oidc.log');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/oidc/authorization_code_flow')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services,
    junit: {
      reportName: 'X-Pack Security API Integration Tests (OIDC - Authorization Code Flow)',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.authc.realms.oidc.oidc1.order=0',
        `xpack.security.authc.realms.oidc.oidc1.rp.client_id=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.client_secret=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.response_type=code`,
        `xpack.security.authc.realms.oidc.oidc1.rp.redirect_uri=http://localhost:${kibanaPort}/api/security/oidc/callback`,
        `xpack.security.authc.realms.oidc.oidc1.op.authorization_endpoint=https://test-op.elastic.co/oauth2/v1/authorize`,
        `xpack.security.authc.realms.oidc.oidc1.op.endsession_endpoint=https://test-op.elastic.co/oauth2/v1/endsession`,
        `xpack.security.authc.realms.oidc.oidc1.op.token_endpoint=http://localhost:${kibanaPort}/api/oidc_provider/token_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.userinfo_endpoint=http://localhost:${kibanaPort}/api/oidc_provider/userinfo_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.issuer=https://test-op.elastic.co`,
        `xpack.security.authc.realms.oidc.oidc1.op.jwkset_path=${jwksPath}`,
        `xpack.security.authc.realms.oidc.oidc1.claims.principal=sub`,
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${plugin}`,
        `--plugin-path=${testEndpointsPlugin}`,
        `--xpack.security.authProviders=${JSON.stringify(['oidc', 'basic'])}`,
        '--xpack.security.authc.oidc.realm="oidc1"',
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
