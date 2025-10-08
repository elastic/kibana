/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// eslint-disable-next-line import/no-default-export
export default createTestConfig('spaces_only', {
  license: 'basic',
  disabledPlugins: ['security'],
  ssl: false,
  testFiles: [require.resolve('./tests/basic')],
});
