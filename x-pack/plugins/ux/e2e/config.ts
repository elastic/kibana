/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { CA_CERT_PATH } from '@kbn/dev-utils';

async function config({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../../test/common/config.js')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.base.js')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
        // API Keys is enabled at the top level
        'xpack.security.enabled=true',
      ],
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      sourceArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.sourceArgs'),
        '--no-watch',
      ],
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        '--home.disableWelcomeScreen=true',
        '--csp.warnLegacyBrowsers=false',
        // define custom kibana server args here
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--elasticsearch.ignoreVersionMismatch=${
          process.env.CI ? 'false' : 'true'
        }`,
        `--uiSettings.overrides.theme:darkMode=false`,
        `--elasticsearch.username=kibana_system`,
        `--elasticsearch.password=changeme`,
        `--xpack.apm.indices.error=apm-*,logs-apm*`,
        `--xpack.apm.indices.onboarding=apm-*`,
        `--xpack.apm.indices.span=apm-*,traces-apm*`,
        `--xpack.apm.indices.transaction=apm-*,traces-apm*`,
        `--xpack.apm.indices.metric=apm-*,metrics-apm*`,
        `--xpack.apm.indices.sourcemap=apm-*`,
        `--xpack.uptime.index=test-*`,
      ],
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default config;
