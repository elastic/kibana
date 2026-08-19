/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

/**
 * FTR config that exercises the "v1 unaffected when v2 is off" guarantee with
 * `xpack.cases.analyticsV2.enabled=false` set EXPLICITLY.
 *
 * The plugin default for `analyticsV2.enabled` is now `true`, so the plain
 * `spaces_only/config.ts` boots Kibana with v2 ON. To keep regression coverage
 * for the flag-off path (noop-writer wiring, no index bootstrap), this
 * dedicated config forces the flag off. The disabled state is a startup flag,
 * so it must live in its own config (toggling mid-suite is not supported) —
 * mirroring the `config_analytics_v2*` companions.
 *
 * Test surface is intentionally tiny (one create/patch/delete + no-index
 * assertions) so the additional Kibana boot is a fixed, bounded cost.
 */
export default createTestConfig('spaces_only', {
  disabledPlugins: ['security'],
  license: 'trial',
  ssl: false,
  testFiles: [require.resolve('./tests/trial/analytics_v2_off_suite')],
  kbnServerArgs: [
    // Explicit `false`, pinned regardless of the plugin default — the entire
    // point of this config is the flag-off regression guard, so the flag must
    // be visible here and independent of whatever the default happens to be.
    '--xpack.cases.analyticsV2.enabled=false',
  ],
});
