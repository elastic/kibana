/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// Note: the attachments-framework API tests run under their own flag-pinned
// configs (`config_trial_attachments.ts` =true, `config_trial_attachments_legacy.ts`
// =false), not this config. The rest of the common suite runs under `config_trial_common.ts`.
export default createTestConfig('security_and_spaces', {
  license: 'trial',
  ssl: true,
  testFiles: [require.resolve('./tests/trial')],
  publicBaseUrl: true,
  kbnServerArgs: ['--xpack.cases.templates.enabled=true'],
});
