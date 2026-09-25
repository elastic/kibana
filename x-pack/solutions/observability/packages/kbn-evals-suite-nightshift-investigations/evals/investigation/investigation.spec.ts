/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { expect } from '@playwright/test';
import pMap from 'p-map';
import { tags } from '@kbn/evals';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { REPO_ROOT } from '@kbn/repo-info';
import { DEDUCTIVE_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { evaluate } from '../../src/evaluate';
import { loadInvestigationDataset } from './datasets';
import { COMPLETION_LABELS, createCompletedWithTraceEvaluator } from './completed_with_trace';
import { INVESTIGATION_TIMEOUT_MS, fetchConversation, runInvestigation } from './task';
import { assertSuccessfulSandboxCommand } from './trace_evidence';
import type { InvestigationTaskOutput } from './types';

evaluate.describe('Nightshift investigations: trace-only', { tag: tags.stateful.classic }, () => {
  evaluate(
    'persists a completion score and complete agent traces per investigation',
    async ({ executorClient, connector, fetch, evalsClient, traceEsClient, repetitions, log }) => {
      const dataset = await loadInvestigationDataset(evalsClient);
      // Matches the task slots the Scout config set reserves; edit both to change parallelism.
      const concurrency = 16;
      // Per batch: the investigation deadline, the grader's trace poll and the evaluator-trace
      // poll below; plus a fixed allowance for setup and score ingestion.
      const batches = Math.ceil((dataset.examples.length * repetitions) / concurrency);
      evaluate.setTimeout(batches * (INVESTIGATION_TIMEOUT_MS + 3 * 60_000) + 5 * 60_000);
      // The typed agent API omits inherited instructions; the source prompt is the acceptance oracle.
      const systemInstructions = cleanPrompt(
        readFileSync(
          join(
            REPO_ROOT,
            'x-pack/solutions/observability/plugins/nightshift_investigations/server/agents/deductive_investigation/instructions/deductive_investigator.md.text'
          ),
          'utf8'
        )
      );
      await fetch('/internal/search_inference_endpoints/settings', {
        method: 'PUT',
        headers: { 'elastic-api-version': '1' },
        body: JSON.stringify({
          features: [
            { feature_id: 'significant_events_investigation', endpoints: [{ id: connector.id }] },
          ],
        }),
      });
      await expect
        .poll(
          async () =>
            (
              await fetch<{ available: boolean }>(
                '/internal/nightshift/investigations/availability'
              )
            ).available,
          { timeout: 60_000 }
        )
        .toBe(true);
      // Availability checks the significant-events workflow, but manual investigations run the
      // deductive one, which Kibana may still be installing right after a cold start.
      await expect
        .poll(
          async () =>
            fetch(`/api/workflows/workflow/${DEDUCTIVE_INVESTIGATION_WORKFLOW_ID}`, {
              headers: { 'elastic-api-version': '2023-10-31' },
            }).then(
              () => true,
              () => false
            ),
          { timeout: 60_000 }
        )
        .toBe(true);
      const [experiment] = await executorClient.runExperiment(
        {
          name: 'Nightshift investigation completion',
          datasets: [dataset],
          trustUpstreamDataset: Boolean(process.env.NIGHTSHIFT_DATASET_NAME),
          concurrency,
          metadata: { concurrency },
          task: (example) => runInvestigation(fetch, example),
        },
        [createCompletedWithTraceEvaluator({ fetch, traceEsClient, systemInstructions })]
      );

      const runs = Object.values(experiment.runs);
      expect(runs).toHaveLength(dataset.examples.length * repetitions);
      expect(new Set(runs.map(({ metadata }) => metadata?.case_id))).toEqual(
        new Set(dataset.examples.map(({ metadata }) => metadata.case_id))
      );
      await expect
        .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
          timeout: 60_000,
        })
        .toBe(runs.length);
      const { examples } = await evalsClient.getExperimentDatasetExamples(
        experiment.id,
        experiment.datasetId
      );
      const scores = examples.flatMap((example) => example.scores);
      expect(scores).toHaveLength(runs.length);
      const bundledFixtures =
        !process.env.NIGHTSHIFT_EXAMPLES_FILE && !process.env.NIGHTSHIFT_DATASET_NAME;

      const histogram = new Map<string, number>();
      await pMap(
        runs,
        async (run) => {
          const output = run.output as InvestigationTaskOutput;
          const exampleScores = scores.filter(
            (score) =>
              score.example.index === run.exampleIndex &&
              score.task.repetition_index === run.repetition
          );
          expect(exampleScores).toHaveLength(1);
          const [score] = exampleScores;
          expect(score.example.metadata?.case_id).toBe(output.case_id);
          expect(score.task.trace_id).toBe(output.traceId);
          // The examples listing returns previews only; the full output comes from the details route.
          const details = await evalsClient.getExperimentExampleDetails(
            experiment.id,
            experiment.datasetId,
            score.example.id,
            run.repetition
          );
          expect(details.task.output).toEqual(JSON.parse(JSON.stringify(output)));
          expect(score.evaluator).toMatchObject({
            name: 'completed_with_trace',
            kind: 'code',
            direction: 'maximize',
            explanation: expect.any(String),
          });
          const label = score.evaluator.label ?? '';
          expect(COMPLETION_LABELS).toContain(label);
          expect(score.evaluator.score).toBe(label === 'completed' ? 1 : 0);
          if (output.traceId) expect(score.evaluator.trace_id).not.toBe(output.traceId);
          histogram.set(label, (histogram.get(label) ?? 0) + 1);
          if (bundledFixtures) {
            // The synthetic questions request a calculation, so an unavailable sandbox cannot pass.
            expect(output.conversation_id).toEqual(expect.any(String));
            const conversation = await fetchConversation(fetch, output.conversation_id ?? '');
            assertSuccessfulSandboxCommand(conversation.rounds);
          }
          // Identifiers and the label only: explanations can quote workflow errors, and the
          // persisted score already carries them where the dataset's contents are allowed.
          log.info(
            JSON.stringify({
              experiment_id: experiment.id,
              dataset_id: experiment.datasetId,
              example_index: run.exampleIndex,
              case_id: output.case_id,
              investigation_id: output.investigation_id,
              conversation_id: output.conversation_id,
              trace_id: output.traceId,
              label,
            })
          );
        },
        { concurrency }
      );
      log.info(
        `completed_with_trace labels: ${JSON.stringify(Object.fromEntries(histogram))} (${
          histogram.get('completed') ?? 0
        }/${runs.length} completed)`
      );
      // Per-example failures stay visible as labels; only a run with nothing concluded fails here.
      expect(histogram.get('completed') ?? 0).toBeGreaterThan(0);

      const evaluatorTraces = experiment.evaluationRuns
        .map(({ traceId }) => traceId)
        .filter((traceId): traceId is string => Boolean(traceId));
      expect(experiment.evaluationRuns).toHaveLength(runs.length);
      expect(experiment.evaluationRuns.every(({ kind }) => kind === 'CODE')).toBe(true);
      expect(evaluatorTraces).toHaveLength(runs.length);
      await pMap(
        evaluatorTraces,
        async (traceId) => {
          await expect
            .poll(
              async () =>
                (
                  await traceEsClient.count({
                    index: 'traces-*',
                    query: { term: { 'trace.id': traceId } },
                  })
                ).count,
              { timeout: 60_000 }
            )
            .toBeGreaterThan(0);
        },
        { concurrency }
      );
      const judgeCalls = await traceEsClient.count({
        index: 'traces-*',
        query: {
          bool: {
            filter: [
              { terms: { 'trace.id': evaluatorTraces } },
              { exists: { field: 'attributes.gen_ai.input.messages' } },
            ],
          },
        },
      });
      expect(judgeCalls.count).toBe(0);
    }
  );
});
