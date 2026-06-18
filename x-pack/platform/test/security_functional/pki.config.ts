/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
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

  const testEndpointsPlugin = resolve(__dirname, './plugins/test_endpoints');

  const caCert = readFileSync(CA_CERT_PATH, 'utf-8');

  const servers = {
    ...kibanaFunctionalConfig.get('servers'),
    elasticsearch: {
      ...kibanaFunctionalConfig.get('servers.elasticsearch'),
      protocol: 'https',
      certificateAuthorities: [caCert],
    },
    kibana: {
      ...kibanaFunctionalConfig.get('servers.kibana'),
      protocol: 'https',
      certificateAuthorities: [caCert],
    },
  };

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [resolve(__dirname, './tests/pki')],

    services,
    pageObjects,

    servers,

    browser: { acceptInsecureCerts: true },

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      ssl: true,
      serverArgs: [
        'xpack.security.authc.token.enabled=true',
        'xpack.security.http.ssl.client_authentication=optional',
        'xpack.security.http.ssl.verification_mode=certificate',
        'xpack.security.authc.realms.native.native1.order=0',
        'xpack.security.authc.realms.pki.pki1.order=1',
        'xpack.security.authc.realms.pki.pki1.delegation.enabled=true',
        `xpack.security.authc.realms.pki.pki1.certificate_authorities=${CA_CERT_PATH}`,
      ],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${testEndpointsPlugin}`,
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--server.ssl.clientAuthentication=optional`,
        `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        '--xpack.security.authc.selector.enabled=false',
        '--xpack.security.authc.providers.pki.pki1.order=0',
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
      reportName: 'Chrome X-Pack Security Functional Tests (PKI)',
    },
  };
}
