/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

// The `nightshift-writeup` suite: only the writeup eval. It replays recorded investigations against
// model and judge connectors, so it needs no sandbox, no live targets and none of the suite's Vault
// secret, and runs on the plain evals server. `playwright.config.ts` still runs it locally with
// NIGHTSHIFT_DATASETS=writeup.
export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals/writeup'),
  timeout: 10 * 60_000,
  concurrency: 16,
});
