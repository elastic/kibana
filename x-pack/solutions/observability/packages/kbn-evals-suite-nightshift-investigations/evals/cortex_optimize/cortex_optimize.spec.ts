/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { selectEvaluators, tags } from '@kbn/evals';
import { createLlmProposeCortexEdits } from '@kbn/nightshift-investigations-plugin/server/cortex/optimize';
import { evaluate } from '../../src/evaluate';
import { readCortexReplayDataset } from './datasets';
import { cortexOptimizeEvaluators } from './evaluators';
import { toKibanaLogger } from './logger';
import { runCortexReplay } from './task';
import type { CortexOptimizeTaskOutput, CortexReplayExample } from './types';

/**
 * Replays saved investigation rounds (the user turn, the tool calls and their results, and the final
 * answer) through the real Cortex optimizer with a real model, against the real page store on an
 * in-memory Elasticsearch fake, and scores the pages it writes.
 *
 * No investigation runs and no sandbox is needed, so the eval isolates what the optimizer learns from
 * a round: tool failures, corrections in a follow-up message, and the outcome of a recovered alert.
 */
const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];

evaluate.describe('Nightshift Cortex optimizer: replay', { tag: suiteTags }, () => {
  evaluate(
    'distils replayed rounds into durable Cortex pages',
    async ({ executorClient, inferenceClient, connector, log, concurrency, repetitions }) => {
      const dataset = readCortexReplayDataset();
      const logger = toKibanaLogger(log);
      const proposeEdits = createLlmProposeCortexEdits({
        inferenceClient: inferenceClient.bindTo({ connectorId: connector.id }),
      });

      const [experiment] = await executorClient.runExperiment(
        {
          name: 'Nightshift Cortex optimizer replay',
          datasets: [dataset],
          concurrency,
          metadata: { concurrency },
          task: (example) =>
            runCortexReplay({ example: example as CortexReplayExample, proposeEdits, logger }),
        },
        selectEvaluators(cortexOptimizeEvaluators)
      );

      const runs = Object.values(experiment.runs);
      expect(runs).toHaveLength(dataset.examples.length * repetitions);
      for (const run of runs) {
        const { error } = run.output as CortexOptimizeTaskOutput;
        expect(error, 'replay failed').toBeUndefined();
      }
    }
  );
});
