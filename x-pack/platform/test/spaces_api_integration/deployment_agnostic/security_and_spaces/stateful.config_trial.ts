/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../default_configs/stateful.config.base';
import { services } from '../services';

export default createStatefulTestConfig({
  services,
  testFiles: [require.resolve('./apis/index_trial')],
  junit: {
    reportName:
      'X-Pack Spaces API Deployment Agnostic Integration Tests -- security_and_spaces - trial license',
  },
});
