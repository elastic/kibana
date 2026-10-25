/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { expect } from '@playwright/test';
import { selectEvaluators, tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { loadWriteupDataset } from './datasets';
import { createWriteupEvaluators } from './evaluators';
import { formatReport, toWriteupRows, type WriteupResults } from './report';
import { WRITEUP_DATA_DIR, createGenerationCache, createWriteupTask, loadPromptArm } from './task';
import type { WriteupTaskOutput } from './types';

/**
 * Rewrites the agent's final reply from a recorded investigation under a given prompt (by default the
 * one in this checkout), and scores how it's written up: deterministic gates, a faithfulness judge and
 * pairwise judges. No investigation runs: the history is recorded, so a run takes minutes and changes only with
 * the prompt, the model and the judge.
 */
const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];

/** Runs below this share of generated replies mean the setup is broken, not the prompt. */
const MIN_REPLY_RATE = 0.8;

const parseVotes = (value = process.env.NIGHTSHIFT_WRITEUP_VOTES): number => {
  if (!value) return 2;
  const votes = Number(value);
  if (!Number.isInteger(votes) || votes < 1) {
    throw new Error(`NIGHTSHIFT_WRITEUP_VOTES must be a positive integer, got "${value}"`);
  }
  return votes;
};

evaluate.describe('Nightshift investigations: writeup', { tag: suiteTags }, () => {
  evaluate(
    'regenerates the reply that closes each round and scores it',
    async ({
      executorClient,
      evalsClient,
      connector,
      evaluationConnector,
      inferenceClient,
      concurrency,
      repetitions,
      log,
    }) => {
      const dataset = await loadWriteupDataset(evalsClient);
      const votes = parseVotes();
      // The checkout's prompt unless NIGHTSHIFT_WRITEUP_PROMPT names another (a git ref or a file).
      const arm = loadPromptArm(process.env.NIGHTSHIFT_WRITEUP_PROMPT);
      const baselineSpec = process.env.NIGHTSHIFT_WRITEUP_BASELINE_PROMPT;
      const baseline = baselineSpec ? loadPromptArm(baselineSpec) : undefined;
      log.info(
        `Rewriting the final reply of ${dataset.examples.length} rounds of ${dataset.name} with prompt ${arm.label} (${arm.hash})` +
          (baseline ? ` against baseline ${baseline.label} (${baseline.hash})` : '')
      );
      // Each example makes one generation per arm plus 1 + 4 × votes judge calls.
      evaluate.setTimeout(
        Math.ceil((dataset.examples.length * repetitions) / concurrency) * 5 * 60_000 + 5 * 60_000
      );

      const evaluators = selectEvaluators(
        createWriteupEvaluators({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          evaluationConnector,
          log,
          votes,
        })
      );
      const cache =
        process.env.NIGHTSHIFT_WRITEUP_CACHE === 'off' ? undefined : createGenerationCache();
      const [experiment] = await executorClient.runExperiment(
        {
          name: 'Nightshift writeup',
          datasets: [dataset],
          trustUpstreamDataset: Boolean(process.env.NIGHTSHIFT_DATASET_NAME),
          concurrency,
          metadata: {
            concurrency,
            votes,
            prompt_hash: arm.hash,
            ...(baseline ? { baseline: baseline.label, baseline_hash: baseline.hash } : {}),
          },
          task: createWriteupTask({
            inferenceClient,
            connectorId: connector.id,
            arm,
            baseline,
            cache,
          }),
        },
        evaluators
      );

      const runs = Object.values(experiment.runs);
      expect(runs).toHaveLength(dataset.examples.length * repetitions);

      const results: WriteupResults = {
        dataset: dataset.name,
        model: connector.id,
        judge: evaluationConnector.id,
        prompt: { label: arm.label, hash: arm.hash },
        ...(baseline ? { baseline: { label: baseline.label, hash: baseline.hash } } : {}),
        votes,
        rows: toWriteupRows(experiment.runs, experiment.evaluationRuns),
      };
      const { summary, report } = formatReport(results);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outDir = join(WRITEUP_DATA_DIR, 'runs', `${stamp}-${evaluationConnector.id}`);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2));
      writeFileSync(join(outDir, 'report.md'), report);
      log.info(`\n${summary}\n\nReport: ${join(outDir, 'report.md')}`);

      // Scores grade the prompt; replies that never came back mean the run itself is broken.
      const failed = runs
        .map(({ output }) => output as WriteupTaskOutput)
        .filter(({ reply }) => !reply);
      for (const { case_id: caseId, error } of failed) {
        log.warning(`No reply for ${caseId}: ${error}`);
      }
      expect(
        (runs.length - failed.length) / runs.length,
        `Too few replies were generated (${failed.length} of ${runs.length} failed)`
      ).toBeGreaterThanOrEqual(MIN_REPLY_RATE);
    }
  );
});
