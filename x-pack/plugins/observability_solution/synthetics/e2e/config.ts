/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { commonFunctionalUIServices } from '@kbn/ftr-common-functional-ui-services';
import { readKibanaConfig } from './tasks/read_kibana_config';
const MANIFEST_KEY = 'xpack.uptime.service.manifestUrl';
const SERVICE_PASSWORD = 'xpack.uptime.service.password';
const SERVICE_USERNAME = 'xpack.uptime.service.username';

async function config({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack/functional/config.base')
  );

  const kibanaConfig = readKibanaConfig();

  const manifestUrl = process.env.SYNTHETICS_SERVICE_MANIFEST ?? kibanaConfig[MANIFEST_KEY];
  const serviceUsername = process.env.SYNTHETICS_SERVICE_USERNAME ?? kibanaConfig[SERVICE_USERNAME];
  const servicePassword = process.env.SYNTHETICS_SERVICE_PASSWORD ?? kibanaConfig[SERVICE_PASSWORD];

  return {
    ...kibanaCommonTestsConfig.getAll(),

    services: {
      ...commonFunctionalServices,
      ...commonFunctionalUIServices,
    },

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
        // API Keys is enabled at the top level
        'xpack.security.enabled=true',
        'xpack.ml.enabled=false',
      ],
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      sourceArgs: process.env.WATCH_ENABLED
        ? []
        : [...xpackFunctionalTestsConfig.get('kbnTestServer.sourceArgs'), '--no-watch'],
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        '--home.disableWelcomeScreen=true',
        '--csp.warnLegacyBrowsers=false',
        // define custom kibana server args here
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        // `--elasticsearch.ignoreVersionMismatch=${process.env.CI ? 'false' : 'true'}`,
        `--elasticsearch.username=kibana_system`,
        `--elasticsearch.password=changeme`,
        '--xpack.reporting.enabled=false',
        `--xpack.uptime.service.manifestUrl=${manifestUrl}`,
        `--xpack.uptime.service.username=${
          process.env.SYNTHETICS_REMOTE_ENABLED
            ? serviceUsername
            : 'localKibanaIntegrationTestsUser'
        }`,
        `--xpack.uptime.service.password=${servicePassword}`,
        '--uiSettings.overrides.observability:enableLegacyUptimeApp=true',
      ],
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default config;
