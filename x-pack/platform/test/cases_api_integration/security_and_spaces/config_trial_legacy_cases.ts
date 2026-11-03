/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// Characterization of the per-solution Cases experience. Both kill switches are pinned off so
// this suite proves that turning them off restores the pre-`/app/cases` behavior.
export default createTestConfig('security_and_spaces', {
  license: 'trial',
  ssl: true,
  testFiles: [require.resolve('./tests/legacy_characterization'), require.resolve('./tests/trial')],
  publicBaseUrl: true,
  kbnServerArgs: [
    '--xpack.cases.templates.enabled=true',
    '--xpack.cases.runWorkflows.enabled=true',
    '--xpack.cases.topLevelApp.enabled=false',
    '--xpack.cases.customStatuses.enabled=false',
  ],
});
