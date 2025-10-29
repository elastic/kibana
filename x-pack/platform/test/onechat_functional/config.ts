/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../onechat/common/config';
import { oneChatFunctionalServices } from '../onechat/services/functional';

export default createStatefulTestConfig({
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
