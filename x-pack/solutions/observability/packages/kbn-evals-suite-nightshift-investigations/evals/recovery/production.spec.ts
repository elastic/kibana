/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags } from '@kbn/evals';
import {
  assertStoredDatasetTags,
  resolveEvalSelection,
  selectStoredDatasets,
} from '../../src/datasets';
import { evaluate } from '../../src/evaluate';
import { createRecoveryEvaluators } from './judges';
import { readProductionReplayDataset, replayProductionRun } from './production_replay';

// Scores recovery rounds a production agent already ran, with the judges the recovery eval uses, so
// a branch's prompt can be compared against what production did. No investigation runs. The examples
// hold customer telemetry, so they come from NIGHTSHIFT_RECOVERY_PRODUCTION_FILE, not the repository.
const suiteTags = [...tags.serverless.observability.complete];
const examplesFile = process.env.NIGHTSHIFT_RECOVERY_PRODUCTION_FILE;

for (const storedDataset of selectStoredDatasets(
  'recovery-production',
  resolveEvalSelection().storedDatasetIds
)) {
  evaluate.describe(`Nightshift recovery: ${storedDataset.id}`, { tag: suiteTags }, () => {
    evaluate.describe.configure({ retries: 0 });
    evaluate(
      'scores the production recovery rounds with the recovery judges',
      async ({
        executorClient,
        inferenceClient,
        evaluationConnector,
        log,
        concurrency,
        repetitions,
      }) => {
        if (!examplesFile) {
          throw new Error(
            'Set NIGHTSHIFT_RECOVERY_PRODUCTION_FILE to the production examples file'
          );
        }
        const dataset = readProductionReplayDataset(examplesFile, storedDataset.name);
        assertStoredDatasetTags(storedDataset, dataset.tags);
        const evaluators = createRecoveryEvaluators({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          evaluationConnector,
          log,
        });
        const [experiment] = await executorClient.runExperiment(
          {
            name: `Nightshift alert-recovery rounds: ${storedDataset.id}`,
            datasets: [dataset],
            concurrency,
            metadata: { concurrency },
            task: async (example) => replayProductionRun(example),
          },
          evaluators
        );
        expect(Object.values(experiment.runs)).toHaveLength(dataset.examples.length * repetitions);
      }
    );
  });
}
