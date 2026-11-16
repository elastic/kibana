/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

export default createTestConfig('security_and_spaces', {
  license: 'basic',
  ssl: true,
  publicBaseUrl: true,
  testFiles: [require.resolve('./tests/common/cases/analytics_index')],
  kbnServerArgs: [
    // v1 is off by default; turn it on for this suite.
    '--xpack.cases.analytics.index.enabled=true',
    // Pin OFF so all writes go to `cases-comments`, the only SO type v1 queries.
    '--xpack.cases.attachments.enabled=false',
  ],
});
