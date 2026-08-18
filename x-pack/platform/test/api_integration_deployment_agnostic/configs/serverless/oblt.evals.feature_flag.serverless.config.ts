/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessFeatureFlagTestConfig } from '../../default_configs/feature_flag.serverless.config.base';
import { services } from '../../services';

export default createServerlessFeatureFlagTestConfig<typeof services>({
  services,
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./oblt.evals.feature_flag.index.ts')],
  kbnServerArgs: ['--xpack.evals.enabled=true'],
  junit: {
    reportName: 'Serverless Observability - Evals API Integration Tests',
  },
});
