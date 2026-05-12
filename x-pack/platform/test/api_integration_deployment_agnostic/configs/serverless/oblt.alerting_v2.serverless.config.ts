/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessFeatureFlagTestConfig } from '../../default_configs/feature_flag.serverless.config.base';

export default createServerlessFeatureFlagTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./oblt.alerting_v2.index.ts')],
  kbnServerArgs: ['--xpack.alerting_v2.enabled=true'],
  junit: {
    reportName: 'Serverless Observability - Deployment-agnostic Alerting V2 API Integration Tests',
  },
});
