/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../agent_builder/common/config';
import { agentBuilderFunctionalServices } from '../agent_builder/services/functional';

export default createStatefulTestConfig({
  services: agentBuilderFunctionalServices,
  testFiles: [require.resolve('./tests')],
  junit: {
    reportName: 'X-Pack Agent Builder Functional Tests',
  },
  kbnServerArgs: [
    `--logging.loggers=${JSON.stringify([
      { name: 'plugins.agentBuilder', level: 'debug', appenders: ['console'] },
    ])}`,
  ],
});
