/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

// Every eval runs unless `NIGHTSHIFT_DATASETS` narrows the selection. Without sandbox credentials an
// unset selection falls back to the smoke eval; an explicit `all`/`trace-only` still fails at startup.
// Keep in sync with the `evals_nightshift_investigations` Scout config set, which applies the same rule.
const requested = process.env.NIGHTSHIFT_DATASETS;
const hasSandbox = Boolean(process.env.SANDBOX_API_KEY);
const selection = requested || (hasSandbox ? 'all' : 'synthetic-smoke');
if (!requested && !hasSandbox) {
  process.stderr.write(
    '[nightshift-investigations] No sandbox credentials (SANDBOX_API_KEY); running only the smoke eval. ' +
      'Use --profile dev-vault or set NIGHTSHIFT_DATASETS to choose explicitly.\n'
  );
}
if (!['all', 'synthetic-smoke', 'trace-only'].includes(selection)) {
  throw new Error(
    `Unknown NIGHTSHIFT_DATASETS: ${selection}. Choose all, synthetic-smoke or trace-only.`
  );
}

const includesInvestigations = selection === 'all' || selection === 'trace-only';

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: includesInvestigations ? 45 * 60_000 : 10 * 60_000,
  testIgnore: {
    all: [],
    'trace-only': ['**/smoke/**'],
    'synthetic-smoke': ['**/investigation/**'],
  }[selection],
});
