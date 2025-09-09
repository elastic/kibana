/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services } from '../api_integration_deployment_agnostic/services';
import { createStatefulTestConfig } from '../api_integration_deployment_agnostic/default_configs/stateful.config.base';

export default createStatefulTestConfig({
  services,
  testFiles: [require.resolve('./apis')],
  junit: {
    reportName: 'X-Pack OneChat API Integration Tests',
  },
  // @ts-expect-error
  kbnTestServer: {
    serverArgs: [
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.onechat',
          level: 'all',
          appenders: ['default'],
        },
      ])}`,
    ],
  },
});
