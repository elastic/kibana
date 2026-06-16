/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import { evaluate } from '../src/evaluate';
import { RE2OB_SCENARIOS } from '../src/scenarios/re2ob_scenarios';
import { replayRcaBenchSnapshot, cleanRcaBenchDataStreams } from '../src/data_generators/replay';
import type { RcaScenario } from '../src/scenarios/types';

interface LoadedScenario {
  scenario: RcaScenario;
  replayResult: LoadResult;
}

evaluate.describe('RE2-OB RCA Benchmark', { tag: tags.serverless.observability.complete }, () => {
  const loadedScenarios: LoadedScenario[] = [];

  evaluate.beforeAll(async ({ esClient, log }) => {
    for (const scenario of RE2OB_SCENARIOS) {
      const replayResult = await replayRcaBenchSnapshot(esClient, log, scenario);
      if (replayResult.success) {
        loadedScenarios.push({ scenario, replayResult });
      } else {
        log.warning(
          `Skipping scenario "${scenario.snapshotName}": snapshot not available or replay failed`
        );
      }
    }

    if (loadedScenarios.length === 0) {
      log.info('No scenarios available — skipping RE2-OB suite');
      evaluate.skip();
    }
  });

  evaluate(
    'investigates root cause across fault-injected Online Boutique scenarios',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'RE2-OB Root Cause Analysis',
          description:
            'Evaluates the agent on Online Boutique fault-injection scenarios from the RCAEval benchmark. ' +
            'Each example corresponds to one injected fault (service + fault type); the agent must identify ' +
            'the root cause service and failure mode from logs and traces.',
          examples: loadedScenarios.map(({ scenario }) => ({
            input: {
              question:
                'A microservice system is experiencing degradation or an outage. ' +
                'Investigate the root cause and identify the responsible service. ' +
                'Use available tools to inspect logs and traces. ' +
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
              dataset: 're2ob',
            },
          })),
        },
      });
    }
  );

  evaluate.afterAll(async ({ esClient, log }) => {
    for (const { replayResult } of loadedScenarios) {
      await cleanRcaBenchDataStreams(esClient, replayResult, log);
    }
  });
});

function buildRcaCriteria(scenario: RcaScenario): string[] {
  return [
    `The final conclusion identifies "${scenario.service}" (or a recognizable variant of the name) as the PRIMARY root cause component — FAIL if the service appears only as a downstream victim of another service, only in a hypothesis that is explicitly refuted or ranked below another conclusion, or if the output concludes that no fault was detected`,
    `Does NOT name a frontend or gateway service (e.g. "frontend", "ingress", "API gateway") as the primary root cause — mentions of such services purely as downstream victims of a cascading failure do NOT violate this criterion`,
    `Cites at least one concrete piece of evidence (error log, anomalous trace latency, error rate spike, or specific tool output)`,
    `The failure mechanism described in the final conclusion is specifically consistent with "${scenario.faultDescription}" — a conclusion of "no fault detected" automatically FAILS; a description of an unrelated resource class (e.g. CPU/memory pressure when the fault is socket exhaustion, or resource exhaustion when the fault is packet loss) also FAILS`,
  ];
}
