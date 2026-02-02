/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';
import { services, pageObjects } from './ftr_provider_context';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.ts')
  );

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [
      require.resolve('./tests/product_intercept_standard_test.ts'),
      require.resolve('./tests/product_intercepts_upgrade_test.ts'),
    ],
    servers: {
      ...kibanaFunctionalConfig.get('servers'),
    },
    services,
    pageObjects,

    junit: {
      reportName: 'X-Pack Product Intercepts Functional Tests',
    },

    esTestCluster: kibanaFunctionalConfig.get('esTestCluster'),
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
    },

    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
    },
  };
}
