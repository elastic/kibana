/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, '../../../evals'),
  // The default Playwright test timeout (5m) is too low for some connector/model combinations.
  // Keep this high enough to avoid spurious timeouts, and use CI step timeouts to bound runtime.
  timeout: 20 * 60_000, // 20 minutes
});
