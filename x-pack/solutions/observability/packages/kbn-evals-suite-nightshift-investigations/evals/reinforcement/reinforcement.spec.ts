/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { reinforcementDataset } from './datasets';
import {
  MERGED_NODES_EVALUATOR,
  SUBMIT_ARGUMENTS_EVALUATOR,
  createMergedNodesEvaluator,
  submitArgumentsEvaluator,
} from './evaluators';
import { runReinforcementExample } from './task';
import type { ReinforcementTaskOutput } from './types';

const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];

evaluate.describe('Nightshift decision-tree reinforcement', { tag: suiteTags }, () => {
  evaluate(
    'replays Customer-0 rounds and grades submit arguments and merged nodes',
    async ({
      executorClient,
      connector,
      fetch,
      esClient,
      evalsClient,
      log,
      inferenceClient,
      evaluationConnector,
    }) => {
      const dataset = reinforcementDataset();
      const judges = [
        submitArgumentsEvaluator,
        createMergedNodesEvaluator({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          evaluationConnector,
          log,
        }),
      ];
      // One round at a time: each seeds a tree, then the reinforcement agent may run for 15 minutes.
      evaluate.setTimeout(dataset.examples.length * 22 * 60_000 + 5 * 60_000);
      const [experiment] = await executorClient.runExperiment(
        {
          name: 'Nightshift reinforcement micro-eval',
          datasets: [dataset],
          concurrency: 1,
          task: (example) =>
            runReinforcementExample({
              esClient,
              fetch,
              connectorId: connector.id,
              example,
            }),
        },
        judges
      );

      const runs = Object.values(experiment.runs);
      expect(runs).toHaveLength(dataset.examples.length);
      expect(new Set(runs.map(({ metadata }) => metadata?.case_id))).toEqual(
        new Set(dataset.examples.map(({ metadata }) => metadata.case_id))
      );
      await expect
        .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
          timeout: 60_000,
        })
        .toBe(runs.length * judges.length);

      for (const run of runs) {
        const output = run.output as ReinforcementTaskOutput;
        expect(output.execution_error).toBeUndefined();
        expect(output.workflow_status).toBe('completed');
        expect(Array.isArray(output.submissions)).toBe(true);
        log.info(
          JSON.stringify({
            experiment_id: experiment.id,
            case_id: output.case_id,
            execution_id: output.execution_id,
            submission_count: output.submissions.length,
            summary: output.submissions.at(-1)?.summary,
            merged_nodes: output.submissions
              .at(-1)
              ?.symptom_trees?.flatMap((tree) => tree.merged_nodes ?? []),
          })
        );
      }

      const { examples } = await evalsClient.getExperimentDatasetExamples(
        experiment.id,
        experiment.datasetId
      );
      const names = new Set(
        examples.flatMap((example) => example.scores.map((score) => score.evaluator.name))
      );
      expect(names).toEqual(new Set([SUBMIT_ARGUMENTS_EVALUATOR, MERGED_NODES_EVALUATOR]));
    }
  );
});
