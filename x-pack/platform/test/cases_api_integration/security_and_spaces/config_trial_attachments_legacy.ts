/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// Legacy byte-clean attachments-framework suite: asserts the exact on-disk
// `cases-comments` shape, which only holds with the feature flag OFF. Pinned
// `=false` so it keeps running once the plugin default flips to ON (until the
// flag is fully retired post-9.5). The default FF-ON counterpart runs under
// `config_trial_attachments.ts`.
export default createTestConfig('security_and_spaces', {
  license: 'trial',
  ssl: true,
  testFiles: [require.resolve('./tests/common/attachments_framework_legacy')],
  publicBaseUrl: true,
  kbnServerArgs: ['--xpack.cases.attachments.enabled=false'],
});
