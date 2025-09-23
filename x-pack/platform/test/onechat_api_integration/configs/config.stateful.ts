/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../../api_integration_deployment_agnostic/default_configs/stateful.config.base';
import { oneChatServices } from './ftr_provider_context';

export default createStatefulTestConfig({
  services: oneChatServices,
  testFiles: [require.resolve('../apis')],
  junit: {
    reportName: 'X-Pack Agent Builder API Integration Tests',
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
