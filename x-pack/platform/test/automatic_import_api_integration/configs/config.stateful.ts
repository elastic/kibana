/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../../api_integration_deployment_agnostic/default_configs/stateful.config.base';
import { automaticImportApiServices } from '../services/api';

export default createStatefulTestConfig({
  services: automaticImportApiServices,
  testFiles: [require.resolve('../apis')],
  junit: {
    reportName: 'X-Pack Automatic Import Stateful API Integration Tests',
  },
  // @ts-expect-error
  kbnTestServer: {
    serverArgs: [
      '--xpack.automatic_import.enabled=true',
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.automaticImport',
          level: 'all',
          appenders: ['default'],
        },
      ])}`,
    ],
  },
});
