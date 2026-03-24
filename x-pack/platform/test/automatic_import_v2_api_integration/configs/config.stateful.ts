/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../../api_integration_deployment_agnostic/default_configs/stateful.config.base';
import { automaticImportV2ApiServices } from '../services/api';

export default createStatefulTestConfig({
  services: automaticImportV2ApiServices,
  testFiles: [require.resolve('../apis')],
  junit: {
    reportName: 'X-Pack Automatic Import V2 Stateful API Integration Tests',
  },
  // @ts-expect-error
  kbnTestServer: {
    serverArgs: [
      '--xpack.automatic_import_v2.enabled=true',
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.automaticImportV2',
          level: 'all',
          appenders: ['default'],
        },
      ])}`,
    ],
  },
});
