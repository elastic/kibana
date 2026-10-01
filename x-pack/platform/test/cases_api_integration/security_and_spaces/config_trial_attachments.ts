/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// Default attachments-framework suite: the unified registry writing to the
// `cases-attachments` SO with the feature flag ON. Pinned `=true` so it is
// unaffected by the plugin default. The byte-clean FF-OFF counterpart runs
// under `config_trial_attachments_legacy.ts`.
export default createTestConfig('security_and_spaces', {
  license: 'trial',
  ssl: true,
  testFiles: [require.resolve('./tests/common/attachments_framework')],
  publicBaseUrl: true,
  kbnServerArgs: ['--xpack.cases.attachments.enabled=true'],
});
