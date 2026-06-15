/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Investigation-workflow variant of the RE2-OB RCA benchmark.
 *
 * Uses the managed investigation workflow (STREAMS_INVESTIGATION_WORKFLOW_ID)
 * instead of the single-agent Agent Builder baseline. Each scenario triggers
 * the 4-agent workflow (context → parallel gather+review × 5 → synthesis) and
 * evaluates the synthesis output with the same RCA criteria as re2ob_local.spec.ts.
 *
 * Prerequisites:
 *   - RCAEVAL_DATA_DIR set to the extracted RE2-OB dataset directory
 *   - Kibana running on branch obs/rca-bench-investigation-workflow-eval
 *     (so the investigation workflow agents are registered)
 *   - xpack.evals.enabled=true
 *
 * Run:
 *   RCAEVAL_DATA_DIR=/home/beast/rcaeval-data \
 *   EVALUATION_CONNECTOR_ID=<judge-connector-id> \
 *   node scripts/evals run --suite rca-benchmark \
 *     --config playwright.workflow.config.ts \
 *     --spec evals/re2ob_investigation_workflow.spec.ts
 */

import { tags } from '@kbn/scout';
import { createSpanLatencyEvaluator, createToolCallsEvaluator } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { RE2OB_SCENARIOS } from '../src/scenarios/re2ob_scenarios';
import type { RcaScenario } from '../src/scenarios/types';
import {
  indexLocalScenario,
  cleanLocalScenario,
  resolveLocalCaseDir,
  type LocalReplayHandle,
} from '../src/data_generators/local_replay';
import { createCriteriaEvaluator } from '../src/criteria_evaluator';
import { InvestigationWorkflowClient } from '../src/investigation_workflow_client';

const RCAEVAL_DATA_DIR = process.env.RCAEVAL_DATA_DIR;
const RCAEVAL_MAX_SCENARIOS = process.env.RCAEVAL_MAX_SCENARIOS
  ? parseInt(process.env.RCAEVAL_MAX_SCENARIOS, 10)
  : undefined;

interface LoadedScenario {
  handle: LocalReplayHandle;
}

evaluate.describe(
  'RE2-OB RCA Benchmark (investigation workflow)',
  { tag: tags.serverless.observability.complete },
  () => {
    // Each workflow run takes ~20-30 minutes; 6 scenarios × 2 concurrent = ~60 min total.
    evaluate.setTimeout(120 * 60_000);

    const loadedScenarios: LoadedScenario[] = [];

    evaluate.beforeAll(async ({ esClient, log }) => {
      if (!RCAEVAL_DATA_DIR) {
        log.info('RCAEVAL_DATA_DIR not set — skipping investigation workflow RE2-OB suite');
        evaluate.skip();
        return;
      }

      for (const scenario of RCAEVAL_MAX_SCENARIOS ? RE2OB_SCENARIOS.slice(0, RCAEVAL_MAX_SCENARIOS) : RE2OB_SCENARIOS) {
        const caseDir = resolveLocalCaseDir(RCAEVAL_DATA_DIR, scenario);
        if (!caseDir) {
          log.warning(
            `Skipping ${scenario.snapshotName}: no local data found under ${RCAEVAL_DATA_DIR}`
          );
          continue;
        }

        const handle = await indexLocalScenario(esClient, log, scenario, caseDir);
        loadedScenarios.push({ handle });
      }

      if (loadedScenarios.length === 0) {
        log.info('No local scenarios available — skipping');
        evaluate.skip();
      }
    });

    evaluate(
      'investigates root cause via investigation workflow across fault-injected Online Boutique scenarios',
      async ({ executorClient, fetch, log, evaluators, traceEsClient }) => {
        const workflowClient = new InvestigationWorkflowClient(fetch, log);

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'RE2-OB Root Cause Analysis (investigation workflow)',
                description:
                  'Evaluates the investigation workflow on Online Boutique fault-injection ' +
                  'scenarios from the RCAEval benchmark, using locally extracted CSV data. ' +
                  'Each example triggers the 4-agent managed investigation workflow ' +
                  '(context → parallel gather+review → synthesis). ' +
                  'Results are compared against the single-agent Agent Builder baseline.',
                examples: loadedScenarios.map(({ handle }) =>
                  buildExample(handle.scenario, handle.logsIndex, handle.tracesIndex, handle.metricsIndex)
                ),
              },
            ],
            // Run 2 workflows concurrently: each takes ~20-30 min so 3 batches × 30 min = ~90 min.
            // Higher concurrency risks overwhelming Task Manager's workflow execution queue.
            concurrency: 2,
            task: async ({ input }) => {
              const { streamNames, scenarioId, scenarioTitle, service, faultType } =
                input as {
                  streamNames: string[];
                  scenarioId: string;
                  scenarioTitle: string;
                  service: string;
                  faultType: string;
                };

              const response = await workflowClient.run({
                streamNames,
                scenarioId,
                scenarioTitle,
                service,
                faultType,
              });

              return {
                errors: response.errors,
                messages: response.messages,
                steps: response.steps,
                traceId: response.traceId,
              };
            },
          },
          [
            createCriteriaEvaluator({ evaluators }),
            createToolCallsEvaluator({ traceEsClient, log }),
            evaluators.traceBasedEvaluators.inputTokens,
            evaluators.traceBasedEvaluators.outputTokens,
            evaluators.traceBasedEvaluators.cachedTokens,
            createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
          ]
        );
      }
    );

    evaluate.afterAll(async ({ esClient, log }) => {
      for (const { handle } of loadedScenarios) {
        await cleanLocalScenario(esClient, handle, log);
      }
    });
  }
);

function buildExample(scenario: RcaScenario, logsIndex: string, tracesIndex: string, metricsIndex: string) {
  return {
    input: {
      streamNames: [logsIndex, tracesIndex, metricsIndex],
      scenarioId: scenario.snapshotName,
      scenarioTitle: `${scenario.service} / ${scenario.faultType}`,
      service: scenario.service,
      faultType: scenario.faultType,
    },
    output: {
      criteria: buildRcaCriteria(scenario),
    },
    metadata: {
      service: scenario.service,
      faultType: scenario.faultType,
      dataset: 're2ob-investigation-workflow',
    },
  };
}

function buildRcaCriteria(scenario: RcaScenario): string[] {
  return [
    `Identifies "${scenario.service}" (or a recognizable variant of the name) as the root cause component`,
    `Does NOT attribute the root cause solely to a frontend or gateway service unless that is the actual fault location`,
    `Cites at least one concrete piece of evidence (error log, anomalous trace latency, error rate spike, or specific tool output)`,
    `Describes the failure mode consistent with: ${scenario.faultDescription}`,
  ];
}
