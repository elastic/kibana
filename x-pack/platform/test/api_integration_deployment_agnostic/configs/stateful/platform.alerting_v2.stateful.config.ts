/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { findTestPluginPaths } from '@kbn/test';
import { createStatefulFeatureFlagTestConfig } from '../../default_configs/feature_flag.stateful.config.base';

export default createStatefulFeatureFlagTestConfig({
  testFiles: [require.resolve('./platform.alerting_v2.index.ts')],
  kbnServerArgs: [
    '--xpack.alerting_v2.enabled=true',
    ...findTestPluginPaths(path.resolve(__dirname, '../../plugins')),
  ],
  junit: {
    reportName: 'Platform Stateful - Deployment-agnostic Alerting V2 API Integration Tests',
  },
});
