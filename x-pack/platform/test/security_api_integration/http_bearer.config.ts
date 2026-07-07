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
  const jwksPath = require.resolve('@kbn/security-api-integration-helpers/oidc/jwks.json');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/http_bearer')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services,
    junit: {
      reportName: 'X-Pack Security API Integration Tests (HTTP Bearer)',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',

        // JWT WITH shared secret
        'xpack.security.authc.realms.jwt.jwt_with_secret.allowed_audiences=elasticsearch',
        `xpack.security.authc.realms.jwt.jwt_with_secret.allowed_issuer=https://kibana.elastic.co/jwt/`,
        `xpack.security.authc.realms.jwt.jwt_with_secret.allowed_signature_algorithms=[RS256]`,
        `xpack.security.authc.realms.jwt.jwt_with_secret.allowed_subjects=elastic-agent`,
        `xpack.security.authc.realms.jwt.jwt_with_secret.claims.principal=sub`,
        'xpack.security.authc.realms.jwt.jwt_with_secret.client_authentication.type=shared_secret',
        `xpack.security.authc.realms.jwt.jwt_with_secret.client_authentication.shared_secret=my_super_secret`,
        'xpack.security.authc.realms.jwt.jwt_with_secret.order=0',
        `xpack.security.authc.realms.jwt.jwt_with_secret.pkc_jwkset_path=${jwksPath}`,
        `xpack.security.authc.realms.jwt.jwt_with_secret.token_type=access_token`,

        // JWT WITHOUT shared secret
        'xpack.security.authc.realms.jwt.jwt_without_secret.allowed_audiences=elasticsearch',
        `xpack.security.authc.realms.jwt.jwt_without_secret.allowed_issuer=https://kibana.elastic.co/jwt/no-secret`,
        `xpack.security.authc.realms.jwt.jwt_without_secret.allowed_signature_algorithms=[RS256]`,
        `xpack.security.authc.realms.jwt.jwt_without_secret.allowed_subjects=elastic-agent-no-secret`,
        `xpack.security.authc.realms.jwt.jwt_without_secret.claims.principal=sub`,
        'xpack.security.authc.realms.jwt.jwt_without_secret.client_authentication.type=none',
        'xpack.security.authc.realms.jwt.jwt_without_secret.order=1',
        `xpack.security.authc.realms.jwt.jwt_without_secret.pkc_jwkset_path=${jwksPath}`,
        `xpack.security.authc.realms.jwt.jwt_without_secret.token_type=access_token`,
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${testEndpointsPlugin}`,
      ],
    },
  };
}
