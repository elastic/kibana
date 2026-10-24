/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { getDatasetCustomContext, replaceCustomContext } from '../investigation/custom_context';
import {
  CUSTOMER0_REINFORCEMENT_DATASET,
  loadCustomer0ReinforcementDataset,
  loadReinforcementExamples,
  reinforcementDataset,
} from './datasets';
import {
  MERGED_NODES_EVALUATOR,
  SUBMIT_ARGUMENTS_EVALUATOR,
  createMergedNodesEvaluator,
  submitArgumentsEvaluator,
} from './evaluators';
import {
  CUSTOMER0_REINFORCEMENT_TIMEOUT_MS,
  runCustomer0Reinforcement,
  runReinforcementExample,
} from './task';
import type { ReinforcementTaskOutput } from './types';

const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];

const assertReinforcementScores = async ({
  experiment,
  evalsClient,
  log,
  judgeCount,
  caseIds,
}: {
  experiment: {
    id: string;
    datasetId: string;
    runs: Record<string, { metadata?: Record<string, unknown> | null; output: unknown }>;
  };
  evalsClient: {
    getExperimentScores: (id: string) => Promise<readonly unknown[]>;
    getExperimentDatasetExamples: (
      experimentId: string,
      datasetId: string
    ) => Promise<{
      examples: Array<{
        scores: Array<{
          evaluator: { name: string; score?: number | null; explanation?: string | null };
        }>;
      }>;
    }>;
  };
  log: { info: (message: string) => void };
  judgeCount: number;
  caseIds: string[];
}) => {
  const runs = Object.values(experiment.runs);
  expect(runs).toHaveLength(caseIds.length);
  expect(new Set(runs.map(({ metadata }) => metadata?.case_id))).toEqual(new Set(caseIds));
  await expect
    .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
      timeout: 60_000,
    })
    .toBe(runs.length * judgeCount);

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
  const structural = examples.flatMap((example) =>
    example.scores.filter((score) => score.evaluator.name === SUBMIT_ARGUMENTS_EVALUATOR)
  );
  expect(structural).toHaveLength(runs.length);
  for (const score of structural) {
    expect(score.evaluator.score, score.evaluator.explanation ?? 'submit arguments').toBe(1);
  }
};

evaluate.describe('Nightshift decision-tree reinforcement', { tag: suiteTags }, () => {
  evaluate(
    'runs a few Customer-0 investigations and grades the reinforcement submit',
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
      const judges = [
        submitArgumentsEvaluator,
        createMergedNodesEvaluator({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          evaluationConnector,
          log,
        }),
      ];
      const tracesFile = process.env.NIGHTSHIFT_REINFORCEMENT_TRACES_FILE;
      if (tracesFile) {
        const dataset = reinforcementDataset(loadReinforcementExamples(tracesFile));
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
        await assertReinforcementScores({
          experiment,
          evalsClient,
          log,
          judgeCount: judges.length,
          caseIds: dataset.examples.map(({ metadata }) => metadata.case_id),
        });
        return;
      }

      const datasetName =
        process.env.NIGHTSHIFT_REINFORCEMENT_DATASET ?? CUSTOMER0_REINFORCEMENT_DATASET;
      const dataset = await loadCustomer0ReinforcementDataset(evalsClient, datasetName);
      await replaceCustomContext(fetch, getDatasetCustomContext(datasetName));
      // The investigation stays in progress until its post-execution reinforcement run finishes.
      evaluate.setTimeout(
        dataset.examples.length * (CUSTOMER0_REINFORCEMENT_TIMEOUT_MS + 5 * 60_000)
      );
      const [experiment] = await executorClient.runExperiment(
        {
          name: 'Nightshift reinforcement micro-eval',
          datasets: [dataset],
          concurrency: 1,
          task: (example) =>
            runCustomer0Reinforcement({
              esClient,
              fetch,
              connector,
              example,
            }),
        },
        judges
      );
      await assertReinforcementScores({
        experiment,
        evalsClient,
        log,
        judgeCount: judges.length,
        caseIds: dataset.examples.map(({ metadata }) => metadata.case_id),
      });
    }
  );
});
