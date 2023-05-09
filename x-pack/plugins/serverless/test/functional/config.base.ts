/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import { services } from './services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../../../../test/functional/config.base.js')
  );

  return {
    pageObjects,
    services,
    servers: xPackFunctionalTestsConfig.get('servers'),
    uiSettings: xPackFunctionalTestsConfig.get('uiSettings'),
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'), '--serverless'],
    },
    esTestCluster: {
      ...xPackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },
    // the apps section defines the urls that
    // `PageObjects.common.navigateTo(appKey)` will use.
    // Merge urls for your plugin with the urls defined in
    // Kibana's config in order to use this helper
    apps: {
      home: {
        pathname: '/app/home',
        hash: '/',
      },
    },
  };
}
