/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createStatefulTestConfig } from '../../api_integration_deployment_agnostic/default_configs/stateful.config.base';
import { oneChatServices } from '../configs/ftr_provider_context';

const kibanaDevYmlPath = path.resolve(REPO_ROOT, 'config/kibana.dev.yml');

export default createStatefulTestConfig({
  services: oneChatServices,
  testFiles: [require.resolve('./generate_esql.ts')],
  junit: {
    reportName: 'X-Pack OneChat Eval Stateful API Integration Tests',
  },
  // @ts-expect-error
  kbnTestServer: {
    serverArgs: [
      `--config=${kibanaDevYmlPath}`,
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.onechat',
          level: 'all',
          appenders: ['default'],
        },
      ])}`,
    ],
  },
  esTestCluster: {
    license: 'trial',
  },
});
