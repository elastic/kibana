/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/api_integration/config')
  );
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../../config.ts'));
  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');

  const saml1IdPMetadataPath = require.resolve(
    '@kbn/security-api-integration-helpers/saml/idp_metadata.xml'
  );

  const servers = {
    ...xPackAPITestsConfig.get('servers'),
    elasticsearch: {
      ...xPackAPITestsConfig.get('servers.elasticsearch'),
      protocol: 'https',
    },
    kibana: {
      ...xPackAPITestsConfig.get('servers.kibana'),
      protocol: 'https',
      certificateAuthorities: [readFileSync(CA_CERT_PATH)],
    },
  };

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/relay_state')],
    servers,
    security: { disableTestUser: true },
    services: {
      ...kibanaAPITestsConfig.get('services'),
      ...xPackAPITestsConfig.get('services'),
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Login Selector)',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      ssl: true,
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.authc.realms.saml.saml1.order=0',
        `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${saml1IdPMetadataPath}`,
        'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
      ],

      // We're going to use the same TGT multiple times and during a short period of time, so we
      // have to disable replay cache so that ES doesn't complain about that.
      esJavaOpts: `-Dsun.security.krb5.rcache=none`,
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.certificateAuthorities=${JSON.stringify([CA_CERT_PATH])}`,
        `--server.ssl.clientAuthentication=optional`,
        `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic1: { order: 0 } },
          saml: {
            saml1: {
              order: 1,
              realm: 'saml1',
              maxRedirectURLSize: '100b',
              useRelayStateDeepLink: true,
            },
          },
          anonymous: {
            anonymous1: {
              order: 6,
              credentials: { username: 'anonymous_user', password: 'changeme' },
            },
          },
        })}`,
      ],
    },
  };
}
