/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Simplified investigation workflow variants:
 *
 * 1. Single-agent (system-streams-sigevents-investigation-single):
 *    One ai.agent step using elastic-ai-agent (same as conversational baseline).
 *    Expected to score ~= conversational baseline. If not, the workflow wrapper
 *    is introducing overhead that needs investigation.
 *
 * 2. Adversarial loop (system-streams-sigevents-investigation-adversarial):
 *    Investigator agent proposes root cause, Critic tries to disprove it.
 *    Up to 3 rounds. Expected to score > baseline through adversarial refinement.
 *
 * Data isolation: each scenario is indexed just before its run and cleaned
 * immediately after (concurrency:1) to prevent MCP tool cross-contamination.
 *
 * Run single-agent:
 *   RCAEVAL_DATA_DIR=/home/beast/rcaeval-data \
 *   EVALUATION_CONNECTOR_ID=anthropic-claude-4-5-haiku \
 *   node scripts/evals run --suite rca-benchmark --grep "single-agent investigation workflow"
 *
 * Run adversarial:
 *   RCAEVAL_DATA_DIR=/home/beast/rcaeval-data \
 *   EVALUATION_CONNECTOR_ID=anthropic-claude-4-5-haiku \
 *   node scripts/evals run --suite rca-benchmark --grep "adversarial investigation workflow"
 *
 * Run one scenario only (for quick validation):
 *   RCAEVAL_MAX_SCENARIOS=1 RCAEVAL_DATA_DIR=... node scripts/evals run ...
 */

import { tags } from '@kbn/scout';
import type { Evaluator } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { RE2OB_SCENARIOS } from '../src/scenarios/re2ob_scenarios';
import type { RcaScenario } from '../src/scenarios/types';
import {
  indexLocalScenario,
  cleanLocalScenario,
  resolveLocalCaseDir,
} from '../src/data_generators/local_replay';
import { createCriteriaEvaluator } from '../src/criteria_evaluator';
import { SimpleWorkflowClient } from '../src/simple_workflow_client';
import type { ConverseUsage } from '../src/agent_builder_client';

const RCAEVAL_DATA_DIR = process.env.RCAEVAL_DATA_DIR;
const RCAEVAL_MAX_SCENARIOS = process.env.RCAEVAL_MAX_SCENARIOS
  ? parseInt(process.env.RCAEVAL_MAX_SCENARIOS, 10)
  : undefined;

const SINGLE_AGENT_WORKFLOW_ID = 'system-streams-sigevents-investigation-single';
const ADVERSARIAL_WORKFLOW_ID = 'system-streams-sigevents-investigation-adversarial';

interface ScenarioToRun {
  scenario: RcaScenario;
  caseDir: string;
}

function createUsageEvaluator(name: string, field: keyof ConverseUsage): Evaluator {
  return {
    name,
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const usage = (output as { usage?: ConverseUsage } | undefined)?.usage;
      const value = usage?.[field] ?? null;
      return { score: value };
    },
  };
}

function buildRcaCriteria(scenario: RcaScenario): string[] {
  return [
    `The final conclusion identifies "${scenario.service}" (or a recognizable variant of the name) as the PRIMARY root cause component — FAIL if the service appears only as a downstream victim of another service, only in a hypothesis that is explicitly refuted or ranked below another conclusion, or if the output concludes that no fault was detected`,
    `Does NOT name a frontend or gateway service (e.g. "frontend", "ingress", "API gateway") as the primary root cause — mentions of such services purely as downstream victims of a cascading failure do NOT violate this criterion`,
    `Cites at least one concrete piece of evidence (error log, anomalous trace latency, error rate spike, or specific tool output)`,
    `The failure mechanism described in the final conclusion is specifically consistent with "${scenario.faultDescription}" — a conclusion of "no fault detected" automatically FAILS; a description of an unrelated resource class (e.g. CPU/memory pressure when the fault is socket exhaustion, or resource exhaustion when the fault is packet loss) also FAILS`,
  ];
}

function createWorkflowExperiment(
  workflowId: string,
  datasetName: string,
  scenariosToRun: ScenarioToRun[]
) {
  return async ({ executorClient, esClient, fetch, log, evaluators }: any) => {
    const client = new SimpleWorkflowClient(fetch, log, workflowId);

    await executorClient.runExperiment(
      {
        datasets: [
          {
            name: datasetName,
            description: `RE2-OB RCA benchmark using workflow: ${workflowId}. ` +
              `Data is indexed fresh per scenario and cleaned up immediately after ` +
              `to prevent cross-scenario MCP tool contamination.`,
            examples: scenariosToRun.map(({ scenario, caseDir }) => ({
              input: { scenario, caseDir },
              output: { criteria: buildRcaCriteria(scenario) },
              metadata: {
                service: scenario.service,
                faultType: scenario.faultType,
                dataset: 're2ob-simple-workflow',
                workflowId,
              },
            })),
          },
        ],
        concurrency: 1,
        task: async ({ input }: any) => {
          const { scenario, caseDir } = input as ScenarioToRun;
          const handle = await indexLocalScenario(esClient, log, scenario, caseDir);
          const { logsIndex, tracesIndex, metricsIndex } = handle;

          try {
            const response = await client.run({
              streamNames: [logsIndex, tracesIndex, metricsIndex],
              scenarioId: scenario.snapshotName,
              scenarioTitle: `${scenario.service} / ${scenario.faultType}`,
              service: scenario.service,
              faultType: scenario.faultType,
            });
            return {
              errors: response.errors,
              messages: response.messages,
              steps: response.steps,
              traceId: response.traceId,
              usage: response.usage,
            };
          } finally {
            await cleanLocalScenario(esClient, handle, log);
          }
        },
      },
      [
        createCriteriaEvaluator({ evaluators }),
        createUsageEvaluator('Input Tokens', 'input_tokens'),
        createUsageEvaluator('Output Tokens', 'output_tokens'),
        createUsageEvaluator('LLM Calls', 'llm_calls'),
      ]
    );
  };
}

evaluate.describe(
  'RE2-OB RCA Benchmark (simple workflows)',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate.setTimeout(180 * 60_000);

    const scenariosToRun: ScenarioToRun[] = [];

    evaluate.beforeAll(async ({ log }) => {
      if (!RCAEVAL_DATA_DIR) {
        log.info('RCAEVAL_DATA_DIR not set — skipping simple workflow RE2-OB suite');
        evaluate.skip();
        return;
      }

      const scenarios = RCAEVAL_MAX_SCENARIOS
        ? RE2OB_SCENARIOS.slice(0, RCAEVAL_MAX_SCENARIOS)
        : RE2OB_SCENARIOS;

      for (const scenario of scenarios) {
        const caseDir = resolveLocalCaseDir(RCAEVAL_DATA_DIR, scenario);
        if (!caseDir) {
          log.warning(`Skipping ${scenario.snapshotName}: no local data found`);
          continue;
        }
        scenariosToRun.push({ scenario, caseDir });
      }

      if (scenariosToRun.length === 0) {
        log.info('No local scenarios available — skipping');
        evaluate.skip();
      }
    });

    evaluate(
      'single-agent investigation workflow (conversational-in-workflow baseline validation)',
      createWorkflowExperiment(
        SINGLE_AGENT_WORKFLOW_ID,
        'RE2-OB Root Cause Analysis (single-agent workflow)',
        scenariosToRun
      )
    );

    evaluate(
      'adversarial investigation workflow (investigator + critic loop, up to 3 rounds)',
      createWorkflowExperiment(
        ADVERSARIAL_WORKFLOW_ID,
        'RE2-OB Root Cause Analysis (adversarial workflow)',
        scenariosToRun
      )
    );
  }
);
