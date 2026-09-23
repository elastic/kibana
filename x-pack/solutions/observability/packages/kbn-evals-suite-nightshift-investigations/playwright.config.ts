/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { resolveEvalSelection } from './src/datasets/eval_selection';

// The `evals_nightshift_investigations` Scout config set starts the investigation server whenever
// SANDBOX_API_KEY is set, which is exactly when investigation specs can run here.
const { runSmoke, runInvestigations, fellBackToSmoke } = resolveEvalSelection();
// Workers re-evaluate this config; only the main process (no TEST_WORKER_INDEX) warns.
if (fellBackToSmoke && process.env.TEST_WORKER_INDEX === undefined) {
  process.stderr.write(
    '[nightshift-investigations] No sandbox credentials (SANDBOX_API_KEY); running only the smoke eval. ' +
      'Use --profile dev-vault or set NIGHTSHIFT_DATASETS to choose explicitly.\n'
  );
}

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: runInvestigations ? 45 * 60_000 : 10 * 60_000,
  testIgnore: [
    ...(runSmoke ? [] : ['**/smoke/**']),
    ...(runInvestigations ? [] : ['**/investigation/**']),
  ],
});
