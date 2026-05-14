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
 *
 * `xpack.cases.analytics.enable_debug_mode=true` opts into the mutating
 * admin routes (`/reset`, `/reconcile/run_soon`) so the suite can
 * exercise them. The read-only `/state` route is registered regardless
 * once v2 is on; the flag only gates the mutating pair. See
 * `cases_analytics_v2/routes/index.ts` for the gating rationale.
 */
export default createTestConfig('spaces_only', {
  disabledPlugins: ['security'],
  license: 'trial',
  ssl: false,
  testFiles: [require.resolve('./tests/trial/analytics_v2')],
  kbnServerArgs: [
    '--xpack.cases.analyticsV2.enabled=true',
    '--xpack.cases.analytics.enable_debug_mode=true',
  ],
});
