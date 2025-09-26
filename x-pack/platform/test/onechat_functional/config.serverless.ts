/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneChatFunctionalServices } from '../onechat/services/functional';
import { createServerlessTestConfig } from '../onechat/common/functional_config';

export default createServerlessTestConfig({
  serverlessProject: 'es',
  services: oneChatFunctionalServices,
  testFiles: [require.resolve('./tests')],
  junit: {
    reportName: 'X-Pack Agent Builder Functional Tests',
  },
  kbnServerArgs: [
    '--uiSettings.overrides.agentBuilder:enabled=true',
    `--logging.loggers=${JSON.stringify([
      { name: 'plugins.onechat', level: 'debug', appenders: ['console'] },
    ])}`,
  ],
});
