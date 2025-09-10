/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { pageObjects } from '../functional/page_objects';
import { services } from '../functional/services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/functional/config.base')
  );

  const kibanaPort = kibanaFunctionalConfig.get('servers.kibana.port');
  const jwksPath = require.resolve('@kbn/security-api-integration-helpers/oidc/jwks.json');
  const oidcOpPPlugin = resolve(__dirname, '../security_api_integration/plugins/oidc_provider');

  const testEndpointsPlugin = resolve(__dirname, './plugins/test_endpoints');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [resolve(__dirname, './tests/oidc')],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: [
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.realms.oidc.oidc1.order=0',
        `xpack.security.authc.realms.oidc.oidc1.rp.client_id=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.client_secret=0oa8sqpov3TxMWJOt356`,
        `xpack.security.authc.realms.oidc.oidc1.rp.response_type=code`,
        `xpack.security.authc.realms.oidc.oidc1.rp.redirect_uri=http://localhost:${kibanaPort}/api/security/oidc/callback`,
        `xpack.security.authc.realms.oidc.oidc1.rp.post_logout_redirect_uri=http://localhost:${kibanaPort}/security/logged_out`,
        `xpack.security.authc.realms.oidc.oidc1.op.authorization_endpoint=http://localhost:${kibanaPort}/oidc_provider/authorize`,
        `xpack.security.authc.realms.oidc.oidc1.op.endsession_endpoint=http://localhost:${kibanaPort}/oidc_provider/endsession`,
        `xpack.security.authc.realms.oidc.oidc1.op.token_endpoint=http://localhost:${kibanaPort}/api/oidc_provider/token_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.userinfo_endpoint=http://localhost:${kibanaPort}/api/oidc_provider/userinfo_endpoint`,
        `xpack.security.authc.realms.oidc.oidc1.op.issuer=https://test-op.elastic.co`,
        `xpack.security.authc.realms.oidc.oidc1.op.jwkset_path=${jwksPath}`,
        `xpack.security.authc.realms.oidc.oidc1.claims.principal=sub`,
      ],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${oidcOpPPlugin}`,
        `--plugin-path=${testEndpointsPlugin}`,
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        '--xpack.security.authc.selector.enabled=false',
        '--xpack.security.authc.providers.oidc.oidc1.order=0',
        '--xpack.security.authc.providers.oidc.oidc1.realm=oidc1',
        '--xpack.security.authc.providers.basic.basic1.order=1',
        '--server.restrictInternalApis=false',
      ],
    },
    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },
    apps: kibanaFunctionalConfig.get('apps'),
    screenshots: { directory: resolve(__dirname, 'screenshots') },

    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests (OpenID Connect)',
    },
  };
}
