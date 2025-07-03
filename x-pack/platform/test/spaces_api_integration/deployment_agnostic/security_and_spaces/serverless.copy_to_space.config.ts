/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '../default_configs/serverless.config.base';
import { services } from '../services';

export default createServerlessTestConfig({
  services,
  serverlessProject: 'security',
  testFiles: [require.resolve('./apis/copy_to_space/index_trial')],
  junit: {
    reportName:
      'X-Pack Spaces API Deployment Agnostic Integration Tests -- copy_to_space - serverless',
  },
});
