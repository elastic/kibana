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
  const functionalConfig = await readConfigFile(require.resolve('./pki.config'));

  const config = configureHTTP2({
    ...functionalConfig.getAll(),
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.http.ssl.client_authentication=optional',
        'xpack.security.http.ssl.verification_mode=certificate',
        'xpack.security.authc.realms.native.native1.order=0',
        'xpack.security.authc.realms.pki.pki1.order=1',
        'xpack.security.authc.realms.pki.pki1.delegation.enabled=true',
        `xpack.security.authc.realms.pki.pki1.certificate_authorities=${CA_CERT_PATH}`,
      ],
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests HTTP/2 (PKI)',
    },
  });

  // configureHTTP2 replaces server.ssl.certificateAuthorities with just CA_CERT_PATH,
  // but PKI tests also require kibana_ca.crt to verify the untrusted_client fixture
  // (a cert trusted by Kibana but not Elasticsearch). Restore both CAs after the
  // HTTP/2 transformation.
  const serverArgs: string[] = config.kbnTestServer.serverArgs;
  const caArgIdx = serverArgs.findIndex((arg) =>
    arg.startsWith('--server.ssl.certificateAuthorities=')
  );
  if (caArgIdx !== -1) {
    serverArgs[caArgIdx] = `--server.ssl.certificateAuthorities=${JSON.stringify([
      CA_CERT_PATH,
      require.resolve('@kbn/security-api-integration-helpers/pki/kibana_ca.crt'),
    ])}`;
  }

  return config;
}
