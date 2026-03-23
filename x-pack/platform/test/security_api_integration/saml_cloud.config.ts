/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');
  const idpPath = require.resolve('@kbn/security-api-integration-helpers/saml/idp_metadata.xml');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/saml_cloud')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services,
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Cloud SAML)',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.authc.realms.saml.cloud-saml-kibana.order=0',
        `xpack.security.authc.realms.saml.cloud-saml-kibana.idp.metadata.path=${idpPath}`,
        'xpack.security.authc.realms.saml.cloud-saml-kibana.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.entity_id=http://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.logout=http://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.cloud-saml-kibana.sp.acs=http://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.cloud-saml-kibana.attributes.principal=urn:oid:0.0.7',
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.cloud.id=ftr_fake_cloud_id',
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { 'cloud-basic': { order: 0 } },
          saml: { 'cloud-saml-kibana': { order: 1, realm: 'cloud-saml-kibana' } },
        })}`,
      ],
    },
  };
}
