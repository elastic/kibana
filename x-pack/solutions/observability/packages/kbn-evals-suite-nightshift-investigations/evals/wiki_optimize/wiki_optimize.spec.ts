/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { selectEvaluators, tags } from '@kbn/evals';
import { createLlmProposeWikiEdits } from '@kbn/nightshift-investigations-plugin/server/wiki/optimize';
import { evaluate } from '../../src/evaluate';
import { readWikiReplayDataset } from './datasets';
import { wikiOptimizeEvaluators } from './evaluators';
import { toKibanaLogger } from './logger';
import { runWikiReplay } from './task';
import type { WikiOptimizeTaskOutput, WikiReplayExample } from './types';

/**
 * Replays saved investigation rounds (the user turn, the tool calls and their results, and the final
 * answer) through the real Wiki optimizer with a real model, against the real page store on an
 * in-memory Elasticsearch fake, and scores the pages it writes.
 *
 * No investigation runs and no sandbox is needed, so the eval isolates what the optimizer learns from
 * a round: tool failures, corrections in a follow-up message, and the outcome of a recovered alert.
 */
const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];

evaluate.describe('Nightshift Wiki optimizer: replay', { tag: suiteTags }, () => {
  evaluate(
    'distils replayed rounds into durable Wiki pages',
    async ({ executorClient, inferenceClient, connector, log, concurrency, repetitions }) => {
      const dataset = readWikiReplayDataset();
      const logger = toKibanaLogger(log);
      const proposeEdits = createLlmProposeWikiEdits({
        inferenceClient: inferenceClient.bindTo({ connectorId: connector.id }),
      });

      const [experiment] = await executorClient.runExperiment(
        {
          name: 'Nightshift Wiki optimizer replay',
          datasets: [dataset],
          concurrency,
          metadata: { concurrency },
          task: (example) =>
            runWikiReplay({ example: example as WikiReplayExample, proposeEdits, logger }),
        },
        selectEvaluators(wikiOptimizeEvaluators)
      );

      const runs = Object.values(experiment.runs);
      expect(runs).toHaveLength(dataset.examples.length * repetitions);
      for (const run of runs) {
        const { error } = run.output as WikiOptimizeTaskOutput;
        expect(error, 'replay failed').toBeUndefined();
      }
    }
  );
});
