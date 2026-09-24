/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { expect } from '@playwright/test';
import { tags } from '@kbn/evals';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { REPO_ROOT } from '@kbn/repo-info';
import type { GenAISemConvAttributes } from '@kbn/inference-tracing';
import { DEDUCTIVE_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { evaluate } from '../../src/evaluate';
import { readInvestigationDataset } from './datasets';
import { ungradedPlaceholder } from './placeholder';
import { runInvestigation } from './task';
import { assertAgentTrace, assertSuccessfulSandboxCommand } from './trace_evidence';
import type { InvestigationTaskOutput } from './types';

evaluate.describe('Nightshift investigations: trace-only', { tag: tags.stateful.classic }, () => {
  evaluate(
    'persists ungraded investigations and complete agent traces',
    async ({ executorClient, connector, fetch, evalsClient, traceEsClient, repetitions, log }) => {
      const dataset = readInvestigationDataset();
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
          name: 'Nightshift ungraded investigation traces',
          datasets: [dataset],
          concurrency: 2,
          task: (example) => runInvestigation(fetch, example),
        },
        [ungradedPlaceholder]
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

      for (const run of runs) {
        const output = run.output as InvestigationTaskOutput;
        // The placeholder stays at one even on failure; these checks alone establish execution acceptance.
        expect(output.execution_error).toBeUndefined();
        expect(output.workflow_status).toBe('completed');
        expect(output.investigation_id).toEqual(expect.any(String));
        expect(output.conversation_id).toEqual(expect.any(String));
        expect(
          output.structured_report?.conclusion || output.structured_report?.summary
        ).toBeTruthy();
        expect(output.conversation?.rounds.length).toBeGreaterThan(0);
        if (!process.env.NIGHTSHIFT_EXAMPLES_FILE) {
          assertSuccessfulSandboxCommand(output.conversation?.rounds ?? []);
        }
        expect(output.traceId).toMatch(/^[a-f0-9]{32}$/);
        expect(run.traceId).toBe(output.traceId);

        const exampleScores = scores.filter(
          (score) =>
            score.example.index === run.exampleIndex &&
            score.task.repetition_index === run.repetition
        );
        expect(exampleScores).toHaveLength(1);
        const [score] = exampleScores;
        expect(score.example.metadata?.case_id).toBe(output.case_id);
        expect(score.task.trace_id).toBe(output.traceId);
        expect(score.task.output).toEqual(JSON.parse(JSON.stringify(output)));
        expect(score.evaluator).toMatchObject({
          name: 'ungraded_placeholder',
          kind: 'code',
          direction: 'neutral',
          score: 1,
          label: 'ungraded',
          explanation: expect.stringContaining('no quality evaluation was performed'),
        });
        expect(score.evaluator.trace_id).not.toBe(output.traceId);

        const agentTraceIds =
          output.conversation?.rounds.flatMap(({ trace_id: traceId }) =>
            typeof traceId === 'string' ? [traceId] : traceId ?? []
          ) ?? [];
        await expect(async () => {
          const spans = await traceEsClient.search<{ attributes: GenAISemConvAttributes }>({
            index: 'traces-*',
            size: 1_000,
            query: { terms: { 'trace.id': agentTraceIds } },
            _source: ['attributes'],
          });
          assertAgentTrace(
            spans.hits.hits.flatMap(({ _source: source }) => (source ? [source.attributes] : [])),
            {
              question: output.query,
              conversationId: output.conversation_id,
              systemInstructions,
              rounds: output.conversation?.rounds ?? [],
            }
          );
        }).toPass({ timeout: 60_000 });
        log.info(
          JSON.stringify({
            experiment_id: experiment.id,
            dataset_id: experiment.datasetId,
            example_index: run.exampleIndex,
            case_id: output.case_id,
            investigation_id: output.investigation_id,
            conversation_id: output.conversation_id,
            trace_id: output.traceId,
            evaluation: 'ungraded',
          })
        );
      }

      const evaluatorTraces = experiment.evaluationRuns
        .map(({ traceId }) => traceId)
        .filter((traceId): traceId is string => Boolean(traceId));
      expect(experiment.evaluationRuns).toHaveLength(runs.length);
      expect(experiment.evaluationRuns.every(({ kind }) => kind === 'CODE')).toBe(true);
      expect(evaluatorTraces).toHaveLength(runs.length);
      for (const traceId of evaluatorTraces) {
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
      }
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
