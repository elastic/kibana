/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { resolveNightshiftEvalSelection, type NightshiftEvalSelection } from '@kbn/scout';

// Shares its selection rule with the `evals_nightshift_investigations` Scout config set, which
// enables the sandbox for exactly the selections that run investigation specs.
const { selection, needsSandbox, fellBackToSmoke } = resolveNightshiftEvalSelection();
if (fellBackToSmoke) {
  process.stderr.write(
    '[nightshift-investigations] No sandbox credentials (SANDBOX_API_KEY); running only the smoke eval. ' +
      'Use --profile dev-vault or set NIGHTSHIFT_DATASETS to choose explicitly.\n'
  );
}

const TEST_IGNORE: Record<NightshiftEvalSelection, string[]> = {
  all: [],
  'trace-only': ['**/smoke/**'],
  'synthetic-smoke': ['**/investigation/**'],
};

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: needsSandbox ? 45 * 60_000 : 10 * 60_000,
  testIgnore: TEST_IGNORE[selection],
});
