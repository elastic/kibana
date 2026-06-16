/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local-data variant of the RE2-OB RCA benchmark.
 *
 * Uses extracted RCAEval CSV files instead of GCS snapshots — no snapshot
 * infrastructure or GCS credentials required. Set RCAEVAL_DATA_DIR to the
 * directory containing the extracted RE2-OB dataset before running:
 *
 *   RCAEVAL_DATA_DIR=/home/beast/rcaeval-data \
 *   CONNECTOR_ID=openai-gpt-4-1-mini \
 *   npx playwright test --config playwright.config.ts evals/re2ob_local.spec.ts
 *
 * Production CI runs use evals/re2ob.spec.ts (GCS snapshots).
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { RE2OB_SCENARIOS } from '../src/scenarios/re2ob_scenarios';
import type { RcaScenario } from '../src/scenarios/types';
import {
  indexLocalScenario,
  cleanLocalScenario,
  resolveLocalCaseDir,
  type LocalReplayHandle,
} from '../src/data_generators/local_replay';

const RCAEVAL_DATA_DIR = process.env.RCAEVAL_DATA_DIR;
const RCAEVAL_MAX_SCENARIOS = process.env.RCAEVAL_MAX_SCENARIOS
  ? parseInt(process.env.RCAEVAL_MAX_SCENARIOS, 10)
  : undefined;

interface LoadedScenario {
  handle: LocalReplayHandle;
}

evaluate.describe(
  'RE2-OB RCA Benchmark (local CSV data)',
  { tag: tags.serverless.observability.complete },
  () => {
    const loadedScenarios: LoadedScenario[] = [];

    evaluate.beforeAll(async ({ esClient, log }) => {
      if (!RCAEVAL_DATA_DIR) {
        log.info('RCAEVAL_DATA_DIR not set — skipping local RE2-OB suite');
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
      'investigates root cause across fault-injected Online Boutique scenarios',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'RE2-OB Root Cause Analysis (local)',
            description:
              'Evaluates the agent on Online Boutique fault-injection scenarios from the RCAEval ' +
              'benchmark, using locally extracted CSV data. Each example is one injected fault; ' +
              'the agent must identify the root cause service and failure mode.',
            examples: loadedScenarios.map(({ handle }) =>
              buildExample(handle.scenario, handle.logsIndex, handle.tracesIndex, handle.metricsIndex)
            ),
          },
        });
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
      question:
        'A microservice system is experiencing degradation or an outage. ' +
        'Investigate the root cause and identify the responsible service. ' +
        `Telemetry is in: "${logsIndex}" (logs), "${tracesIndex}" (traces), ` +
        `and "${metricsIndex}" (infrastructure metrics: CPU, memory, network, latency). ` +
        'Use available tools to inspect these data streams. ' +
        'State: (1) the root cause component, (2) the failure mode, and (3) supporting evidence.',
      attachments: [
        {
          type: 'screen_context',
          data: {
            app: 'observability-overview',
            url: 'http://localhost:5601/app/observability/overview',
            time_range: { from: 'now-30m', to: 'now' },
          },
          hidden: true,
        },
      ],
    },
    output: {
      criteria: buildRcaCriteria(scenario),
    },
    metadata: {
      service: scenario.service,
      faultType: scenario.faultType,
      dataset: 're2ob-local',
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
