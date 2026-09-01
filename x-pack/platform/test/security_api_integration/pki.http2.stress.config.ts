/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CA_CERT_PATH } from '@kbn/dev-utils';
import type { FtrConfigProviderContext } from '@kbn/test';
import { configureHTTP2 } from '@kbn/test-suites-src/common/configure_http2';

/**
 * FTR config for the PKI HTTP/2 RST_STREAM deterministic regression test (kibana#258232).
 *
 * Extends pki.config (same ES + Kibana setup, including the test_endpoints plugin that serves
 * the /authentication/preauth_holds/* routes) but runs only the stress test suite and adds
 * debug-level security logging so failures are attributable in CI output.
 *
 * The test uses a server-side pre-auth hold (implemented in the test_endpoints plugin's
 * init_routes.ts) to park a request inside PKIAuthenticationProvider.authenticate, then
 * RSTs the HTTP/2 stream and verifies the session survives.
 *
 * To start the stack manually for iterative development:
 *   node scripts/functional_tests_server --config x-pack/platform/test/security_api_integration/pki.http2.stress.config.ts
 *
 * To run only the stress tests:
 *   node scripts/functional_tests --config x-pack/platform/test/security_api_integration/pki.http2.stress.config.ts
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));
  const pkiConfig = await readConfigFile(require.resolve('./pki.config'));

  const config = configureHTTP2({
    ...pkiConfig.getAll(),
    testFiles: [require.resolve('./tests/pki/pki_http2_stress')],
    esTestCluster: {
      ...pkiConfig.get('esTestCluster'),
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
    kbnTestServer: {
      ...pkiConfig.get('kbnTestServer'),
      serverArgs: [
        ...pkiConfig.get('kbnTestServer.serverArgs'),
        // Debug logging for the security auth path — makes RST_STREAM-triggered failures
        // attributable in CI output without searching through all logs.
        `--logging.loggers=${JSON.stringify([
          { name: 'plugins.security.authentication', level: 'debug', appenders: ['default'] },
          { name: 'plugins.security.session', level: 'debug', appenders: ['default'] },
        ])}`,
      ],
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests HTTP/2 PKI RST_STREAM Deterministic',
    },
  });

  // configureHTTP2 overwrites server.ssl.certificateAuthorities with only CA_CERT_PATH.
  // PKI tests also need kibana_ca.crt (for the untrusted_client fixture). Restore both.
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
