/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

export default createTestConfig('spaces_only', {
  disabledPlugins: ['security'],
  license: 'trial',
  ssl: false,
  testFiles: [require.resolve('./tests/trial')],
  // The trial suite includes templates / field-definitions coverage that
  // requires the templates feature. Pin it ON explicitly so the suite is
  // deterministic regardless of the plugin default (mirrors `config_trial.ts`).
  kbnServerArgs: ['--xpack.cases.templates.enabled=true'],
});
