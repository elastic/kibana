/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-default-export */

import { resolve } from 'path';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { pageObjects } from './page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/functional/config.base')
  );

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    // list paths to the files that contain your plugins tests
    testFiles: [resolve(__dirname, './apps/security/basic_license')],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'basic',
      from: 'snapshot',
      serverArgs: [],
    },

    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"', // server restarts should not invalidate active sessions
      ],
    },
    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },
    // the apps section defines the urls that
    // `PageObjects.common.navigateTo(appKey)` will use.
    // Merge urls for your plugin with the urls defined in
    // Kibana's config in order to use this helper
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
    },

    // choose where screenshots should be saved
    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests (Security Basic)',
    },
  };
}
