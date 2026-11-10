/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { resolveEvalSelection } from './src/datasets/eval_selection';
import { selectStoredDatasets } from './src/datasets/stored_datasets';

// The suite's scout hook exports SANDBOX_API_KEY together with SANDBOX_KIBANA_CONFIG, which is what
// makes the `evals_nightshift_investigations` config set start the investigation server.
const { runInvestigations, runOrca, runConnectorProbes, runWikiOptimize, storedDatasetIds } =
  resolveEvalSelection();
const runStoredInvestigations = selectStoredDatasets('investigation', storedDatasetIds).length > 0;
const runStoredConnectorProbes =
  selectStoredDatasets('connector-probe', storedDatasetIds).length > 0;

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: runInvestigations || runStoredInvestigations ? 45 * 60_000 : 10 * 60_000,
  concurrency: 16,
  testIgnore: [
    ...(runInvestigations ? [] : ['**/investigation/investigation.spec.ts']),
    ...(runOrca ? [] : ['**/investigation/orcabench.spec.ts']),
    ...(runStoredInvestigations ? [] : ['**/investigation/stored.spec.ts']),
    ...(runConnectorProbes ? [] : ['**/connector_probe/connector_probe.spec.ts']),
    ...(runStoredConnectorProbes ? [] : ['**/connector_probe/stored.spec.ts']),
    ...(runWikiOptimize ? [] : ['**/wiki_optimize/**']),
  ],
});
