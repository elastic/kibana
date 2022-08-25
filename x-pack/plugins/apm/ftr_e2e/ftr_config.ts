/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { cypressTestRunner } from './cypress_test_runner';
import { FtrProviderContext } from './ftr_provider_context';

async function ftrConfig({ readConfigFile }: FtrConfigProviderContext) {
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
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--home.disableWelcomeScreen=true',
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        // define custom kibana server args here
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
      ],
    },
    testRunner: async (ftrProviderContext: FtrProviderContext) => {
      const result = await cypressTestRunner(ftrProviderContext);

      // set exit code explicitly if at least one Cypress test fails
      if (result && (result.status === 'failed' || result.totalFailed > 0)) {
        process.exitCode = 1;
      }
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default ftrConfig;
