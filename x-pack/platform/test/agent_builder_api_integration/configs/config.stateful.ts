/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../../api_integration_deployment_agnostic/default_configs/stateful.config.base';
import { agentBuilderApiServices } from '../../agent_builder/services/api';

export default createStatefulTestConfig({
  services: agentBuilderApiServices,
  testFiles: [require.resolve('../apis')],
  junit: {
    reportName: 'X-Pack Agent Builder Stateful API Integration Tests',
  },
  // @ts-expect-error
  kbnTestServer: {
    serverArgs: [
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.agentBuilder',
          level: 'all',
          appenders: ['default'],
        },
      ])}`,
    ],
  },
});
