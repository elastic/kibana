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
 * Data isolation: each scenario is indexed immediately before its workflow run
 * and cleaned up immediately after. With concurrency:1 this guarantees only one
 * scenario's data is in Elasticsearch at a time, preventing MCP observability
 * tools (get_services, get_service_topology, etc.) from picking up cross-scenario
 * signals.
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
 *   node scripts/evals run --suite rca-benchmark --grep "investigates root cause via investigation workflow"
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
import { InvestigationWorkflowClient } from '../src/investigation_workflow_client';
import type { ConverseUsage } from '../src/agent_builder_client';

const RCAEVAL_DATA_DIR = process.env.RCAEVAL_DATA_DIR;
const RCAEVAL_MAX_SCENARIOS = process.env.RCAEVAL_MAX_SCENARIOS
  ? parseInt(process.env.RCAEVAL_MAX_SCENARIOS, 10)
  : undefined;

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

evaluate.describe(
  'RE2-OB RCA Benchmark (investigation workflow)',
  { tag: tags.serverless.observability.complete },
  () => {
    // Each workflow run takes ~20-30 minutes; 6 scenarios sequential = ~2h total.
    evaluate.setTimeout(180 * 60_000);

    const scenariosToRun: ScenarioToRun[] = [];

    evaluate.beforeAll(async ({ log }) => {
      if (!RCAEVAL_DATA_DIR) {
        log.info('RCAEVAL_DATA_DIR not set — skipping investigation workflow RE2-OB suite');
        evaluate.skip();
        return;
      }

      const scenarios = RCAEVAL_MAX_SCENARIOS
        ? RE2OB_SCENARIOS.slice(0, RCAEVAL_MAX_SCENARIOS)
        : RE2OB_SCENARIOS;

      for (const scenario of scenarios) {
        const caseDir = resolveLocalCaseDir(RCAEVAL_DATA_DIR, scenario);
        if (!caseDir) {
          log.warning(
            `Skipping ${scenario.snapshotName}: no local data found under ${RCAEVAL_DATA_DIR}`
          );
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
      'investigates root cause via investigation workflow across fault-injected Online Boutique scenarios',
      async ({ executorClient, esClient, fetch, log, evaluators }) => {
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
                  'Data is indexed fresh per scenario and cleaned up immediately after to ' +
                  'prevent cross-scenario contamination in MCP observability tools.',
                examples: scenariosToRun.map(({ scenario, caseDir }) => ({
                  input: {
                    scenario,
                    caseDir,
                  },
                  output: {
                    criteria: buildRcaCriteria(scenario),
                  },
                  metadata: {
                    service: scenario.service,
                    faultType: scenario.faultType,
                    dataset: 're2ob-investigation-workflow',
                  },
                })),
              },
            ],
            // concurrency:1 ensures only one scenario's data is in ES at a time.
            // MCP tools (get_services, get_service_topology, etc.) query by default
            // patterns; concurrent scenarios would bleed into each other's queries.
            concurrency: 1,
            task: async ({ input }) => {
              const { scenario, caseDir } = input as ScenarioToRun;

              // Index this scenario's data just before running the workflow.
              const handle = await indexLocalScenario(esClient, log, scenario, caseDir);
              const { logsIndex, tracesIndex, metricsIndex } = handle;

              try {
                const response = await workflowClient.run({
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
                // Clean up immediately — next scenario starts with a clean slate.
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
      }
    );

    // No afterAll cleanup needed — each task cleans up its own data inline.
  }
);

function buildRcaCriteria(scenario: RcaScenario): string[] {
  return [
    `The final conclusion identifies "${scenario.service}" (or a recognizable variant of the name) as the PRIMARY root cause component — FAIL if the service appears only as a downstream victim of another service, only in a hypothesis that is explicitly refuted or ranked below another conclusion, or if the output concludes that no fault was detected`,
    `Does NOT name a frontend or gateway service (e.g. "frontend", "ingress", "API gateway") as the primary root cause — mentions of such services purely as downstream victims of a cascading failure do NOT violate this criterion`,
    `Cites at least one concrete piece of evidence (error log, anomalous trace latency, error rate spike, or specific tool output)`,
    `The failure mechanism described in the final conclusion is specifically consistent with "${scenario.faultDescription}" — a conclusion of "no fault detected" automatically FAILS; a description of an unrelated resource class (e.g. CPU/memory pressure when the fault is socket exhaustion, or resource exhaustion when the fault is packet loss) also FAILS`,
  ];
}
