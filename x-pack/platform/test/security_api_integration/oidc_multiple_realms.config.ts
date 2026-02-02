/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));
  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');
  const jwksPath = require.resolve('@kbn/security-api-integration-helpers/oidc/jwks.json');
  const oidcAPITestsConfig = await readConfigFile(require.resolve('./oidc.config.ts'));

  return {
    ...oidcAPITestsConfig.getAll(),
    testFiles: [require.resolve('./tests/oidc/multiple_realms')],

    junit: {
      reportName: 'X-Pack Security API Integration Tests (OIDC - Multiple OIDC Realms)',
    },

    esTestCluster: {
      ...oidcAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...oidcAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.realms.oidc.oidc2.order=1',
        `xpack.security.authc.realms.oidc.oidc2.rp.client_id=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc2.rp.client_secret=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc2.rp.response_type=code`,
        `xpack.security.authc.realms.oidc.oidc2.rp.redirect_uri=http://localhost:${kibanaPort}/api/security/oidc/callback`,
        `xpack.security.authc.realms.oidc.oidc2.op.authorization_endpoint=https://test-op-2.elastic.co/oauth2/v1/authorize`,
        `xpack.security.authc.realms.oidc.oidc2.op.endsession_endpoint=https://test-op-2.elastic.co/oauth2/v1/endsession`,
        `xpack.security.authc.realms.oidc.oidc2.op.token_endpoint=http://localhost:${kibanaPort}/api/oidc_provider/token_endpoint/${encodeURIComponent(
          'https://test-op-2.elastic.co'
        )}`,
        `xpack.security.authc.realms.oidc.oidc2.op.userinfo_endpoint=http://localhost:${kibanaPort}/api/oidc_provider/userinfo_endpoint`,
        `xpack.security.authc.realms.oidc.oidc2.op.issuer=https://test-op-2.elastic.co`,
        `xpack.security.authc.realms.oidc.oidc2.op.jwkset_path=${jwksPath}`,
        `xpack.security.authc.realms.oidc.oidc2.claims.principal=sub`,
      ],
    },

    kbnTestServer: {
      ...oidcAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...oidcAPITestsConfig
          .get('kbnTestServer.serverArgs')
          .filter(
            (arg: string) =>
              !arg.includes('xpack.security.authProviders') &&
              !arg.includes('xpack.security.authc.oidc.realm')
          ),
        '--xpack.security.authc.providers.oidc.oidc1.order=0',
        '--xpack.security.authc.providers.oidc.oidc1.realm="oidc1"',
        '--xpack.security.authc.providers.oidc.oidc2.order=1',
        '--xpack.security.authc.providers.oidc.oidc2.realm="oidc2"',
      ],
    },
  };
}
