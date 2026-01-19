/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CA_CERT_PATH } from '@kbn/dev-utils';
import type { FtrConfigProviderContext } from '@kbn/test';
import { configureHTTP2 } from '@kbn/test-suites-src/common/configure_http2';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));
  const functionalConfig = await readConfigFile(require.resolve('./saml.config'));

  const kibanaPort = xPackAPITestsConfig.get('servers.kibana.port');
  const idpPath = require.resolve('@kbn/security-api-integration-helpers/saml/idp_metadata.xml');

  return configureHTTP2({
    ...functionalConfig.getAll(),
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.authc.realms.saml.saml1.order=0',
        `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${idpPath}`,
        'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
        `xpack.security.authc.realms.saml.saml1.sp.entity_id=https://localhost:${kibanaPort}`,
        `xpack.security.authc.realms.saml.saml1.sp.logout=https://localhost:${kibanaPort}/logout`,
        `xpack.security.authc.realms.saml.saml1.sp.acs=https://localhost:${kibanaPort}/api/security/saml/callback`,
        'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
        `xpack.security.authc.realms.saml.saml1.ssl.certificate_authorities=${CA_CERT_PATH}`,
      ],
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests HTTP/2 (SAML)',
    },
  });
}
