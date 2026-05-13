/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

/**
 * FTR config for the cases-analytics v2 integration suite.
 *
 * Runs `tests/trial/analytics_v2/` with the v2 flag flipped on
 * (`xpack.cases.analyticsV2.enabled=true`). Keeping v2 in its own config
 * isolates it from the rest of the trial suite — v2 spins up background
 * tasks (reconciliation, data view bootstrap) that we don't want
 * influencing other tests' fixtures, and a separate config makes it
 * easy to switch the v1 flag independently.
 */
export default createTestConfig('spaces_only', {
  disabledPlugins: ['security'],
  license: 'trial',
  ssl: false,
  testFiles: [require.resolve('./tests/trial/analytics_v2')],
  kbnServerArgs: ['--xpack.cases.analyticsV2.enabled=true'],
});
