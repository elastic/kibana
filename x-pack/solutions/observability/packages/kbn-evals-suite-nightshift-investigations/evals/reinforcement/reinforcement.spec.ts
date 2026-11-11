/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags } from '@kbn/evals';
import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { evaluate } from '../../src/evaluate';
import { saveConnectorSetOnInvestigator } from '../investigation/connector_sets';
import {
  getDatasetCustomContext,
  readCustomContext,
  replaceCustomContext,
} from '../investigation/custom_context';
import { enableNightshiftSpace } from '../investigation/space_setup';
import {
  TRACES_FILE_DATASET_NAME,
  loadCustomer0ReinforcementDataset,
  loadReinforcementExamples,
  reinforcementDataset,
} from './datasets';
import {
  MERGED_NODES_EVALUATOR,
  SUBMIT_ARGUMENTS_EVALUATOR,
  createMergedNodesEvaluator,
  submitArgumentsEvaluator,
} from './judges';
import {
  CUSTOMER0_REINFORCEMENT_TIMEOUT_MS,
  runCustomer0Reinforcement,
  runReinforcementExample,
} from './task';
import { reinforcementExamples } from './traces';
import type { ReinforcementTaskOutput } from './types';

const suiteTags = [...tags.stateful.classic, ...tags.serverless.observability.complete];
/** Service accounts, space binding and managed workflow install can take minutes on a cold start. */
const SETUP_TIMEOUT_MS = 5 * 60_000;
/**
 * Share of runs that must finish with consistent submit arguments. Nothing in the prompt asks for
 * traversals yet, so a model misses one now and then: one miss in four replays passes, two fail.
 */
const MIN_CONSISTENT_RATE = 0.75;

const assertReinforcementScores = async ({
  experiment,
  evalsClient,
  log,
  judgeCount,
  caseIds,
  repetitions,
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
  repetitions: number;
}) => {
  const runs = Object.values(experiment.runs);
  expect(runs).toHaveLength(caseIds.length * repetitions);
  expect(new Set(runs.map(({ metadata }) => metadata?.case_id))).toEqual(new Set(caseIds));
  await expect
    .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
      timeout: 60_000,
    })
    .toBe(runs.length * judgeCount);

  // A failed rollback leaves trees that later replays snapshot as their baseline, so unlike a missed
  // submit it fails the spec on its own, after the scores are recorded.
  const rollbackErrors = runs
    .map(({ output }) => output as ReinforcementTaskOutput)
    .filter(({ rollback_error: rollbackError }) => rollbackError)
    .map(({ case_id: caseId, rollback_error: rollbackError }) => `${caseId}: ${rollbackError}`);
  for (const run of runs) {
    const output = run.output as ReinforcementTaskOutput;
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
  // A run that did not finish scores 0 here too, so it counts against the same rate.
  const failures = structural.filter((score) => score.evaluator.score !== 1);
  const rate = (structural.length - failures.length) / structural.length;
  expect(
    rate,
    `${structural.length - failures.length} of ${
      structural.length
    } runs submitted consistent arguments:\n${failures
      .map((score) => `- ${score.evaluator.explanation ?? 'no explanation'}`)
      .join('\n')}`
  ).toBeGreaterThanOrEqual(MIN_CONSISTENT_RATE);
  expect(rollbackErrors, 'Every replay must roll back its decision trees').toEqual([]);
};

evaluate.describe('Nightshift decision-tree reinforcement', { tag: suiteTags }, () => {
  evaluate(
    'runs a few Customer-0 investigations and grades the reinforcement submit',
    async ({
      config,
      kbnUrl,
      samlAuth,
      executorClient,
      connector,
      fetch,
      esClient,
      evalsClient,
      log,
      inferenceClient,
      evaluationConnector,
      repetitions,
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
      const liveDataset = process.env.NIGHTSHIFT_REINFORCEMENT_DATASET;
      const setup = (workflowIds: readonly string[]) =>
        enableNightshiftSpace({
          config,
          esClient,
          kbnUrl,
          samlAuth,
          fetch,
          log,
          connectorId: connector.id,
          workflowIds,
        });
      // A first Customer-0 investigation creates a new tree, and merged_nodes is rejected on a
      // new tree. The default replays rounds that already have a prior tree, including one merge.
      if (!liveDataset || tracesFile) {
        const dataset = tracesFile
          ? reinforcementDataset(loadReinforcementExamples(tracesFile), TRACES_FILE_DATASET_NAME)
          : reinforcementDataset(reinforcementExamples);
        evaluate.setTimeout(
          dataset.examples.length * repetitions * 22 * 60_000 + 5 * 60_000 + SETUP_TIMEOUT_MS
        );
        await setup([NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID]);
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
                log,
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
          repetitions,
        });
        return;
      }

      const dataset = await loadCustomer0ReinforcementDataset(evalsClient, liveDataset);
      // The investigation stays in progress until its post-execution reinforcement run finishes.
      evaluate.setTimeout(
        dataset.examples.length * repetitions * (CUSTOMER0_REINFORCEMENT_TIMEOUT_MS + 5 * 60_000) +
          SETUP_TIMEOUT_MS
      );
      await setup([NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID, NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID]);
      await saveConnectorSetOnInvestigator(fetch, { withoutConnectors: false });
      const previousCustomContext = await readCustomContext(fetch);
      try {
        await replaceCustomContext(fetch, getDatasetCustomContext(dataset));
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
          repetitions,
        });
      } finally {
        await replaceCustomContext(fetch, previousCustomContext);
      }
    }
  );
});
