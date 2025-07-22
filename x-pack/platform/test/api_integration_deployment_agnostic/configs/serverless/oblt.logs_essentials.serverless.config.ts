/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '../../default_configs/serverless.config.base';

export default createServerlessTestConfig({
  serverlessProject: 'oblt',
  tier: 'oblt_logs_essentials',
  testFiles: [require.resolve('./oblt.logs_essentials.index.ts')],
  junit: {
    reportName:
      'Serverless Observability Logs Essentials - Deployment-agnostic platform API Integration Tests',
  },
});
