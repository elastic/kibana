/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

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

  const kbnTestServerArgOverrides = kibanaCommonConfig
    .get('kbnTestServer.serverArgs')
    .filter((arg: string) => !arg.startsWith('--security.showInsecureClusterWarning'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [resolve(__dirname, './tests/insecure_cluster_warning')],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: ['xpack.security.enabled=false'],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: kbnTestServerArgOverrides,
    },
    apps: kibanaFunctionalConfig.get('apps'),
    junit: {
      reportName: 'Insecure Cluster Warning Functional Tests',
    },
  };
}
