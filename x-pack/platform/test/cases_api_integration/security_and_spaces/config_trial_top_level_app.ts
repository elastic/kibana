/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// The single casesV4 feature and how legacy roles behave once their features are deprecated.
export default createTestConfig('security_and_spaces', {
  license: 'trial',
  ssl: true,
  testFiles: [require.resolve('./tests/top_level_app')],
  publicBaseUrl: true,
  kbnServerArgs: ['--xpack.cases.topLevelApp.enabled=true'],
});
