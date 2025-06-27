/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { findTestPluginPaths } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const integrationConfig = await readConfigFile(require.resolve('../api_integration/config'));

  return {
    testFiles: [require.resolve('./test_suites/task_manager')],
    services,
    servers: integrationConfig.get('servers'),
    esTestCluster: integrationConfig.get('esTestCluster'),
    apps: integrationConfig.get('apps'),
    screenshots: integrationConfig.get('screenshots'),
    junit: {
      reportName: 'Plugin Functional Tests',
    },
    kbnTestServer: {
      ...integrationConfig.get('kbnTestServer'),
      serverArgs: [
        ...integrationConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${path.resolve(
          __dirname,
          '..',
          'plugin_api_integration',
          'plugins',
          'sample_task_plugin'
        )}`,
        ...findTestPluginPaths(path.resolve(__dirname, 'plugins')),
      ],
    },
  };
}
