/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import {
  evaluate as base,
  createQuantitativeCorrectnessEvaluators,
  type DefaultEvaluators,
  type EvaluationDataset,
  type KibanaPhoenixClient,
} from '@kbn/evals';
import { AiInsightClient } from '../src/clients/ai_insight_client';
import { apmErrorCountAIInsight } from '../src/alert_templates/alerts';
import { OTEL_DEMO_SNAPSHOT_NAME, replayObservabilitySignals } from '../src/data_generators/replay';

const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';
const ALERT_CREATION_WAIT_MS = 3000;
const INDEX_REFRESH_WAIT_MS = 2500;

interface AlertAiInsightExample extends Example {
  input: {
    alertId: string;
  };
  output: {
    expected: string;
  };
}

type EvaluateAlertAiInsightsDataset = (params: {
  dataset: {
    name: string;
    description: string;
    examples: AlertAiInsightExample[];
  };
}) => Promise<void>;

function createEvaluateAlertAiInsightsDataset({
  aiInsightClient,
  evaluators,
  phoenixClient,
}: {
  aiInsightClient: AiInsightClient;
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
}): EvaluateAlertAiInsightsDataset {
  return async function evaluateAlertAiInsightsDataset({
    dataset: { name, description, examples },
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input, output, metadata }) => {
          const response = await aiInsightClient.getAlertInsight(input.alertId);

          const correctnessResult = await evaluators.correctnessAnalysis().evaluate({
            input,
            expected: { expected: output.expected },
            output: {
              messages: [{ message: response.summary }],
            },
            metadata,
          });

          return {
            summary: response.summary,
            context: response.context,
            correctnessAnalysis: correctnessResult?.metadata,
          };
        },
      },
      createQuantitativeCorrectnessEvaluators()
    );
  };
}

const evaluate = base.extend<{}, { evaluateDataset: EvaluateAlertAiInsightsDataset }>({
  evaluateDataset: [
    ({ fetch, evaluators, phoenixClient }, use) => {
      const aiInsightClient = new AiInsightClient(fetch);

      use(
        createEvaluateAlertAiInsightsDataset({
          aiInsightClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'worker' },
  ],
});

evaluate.describe('Alert AI Insights', { tag: '@svlOblt' }, () => {
  let ruleId: string;
  let alertId: string;

  evaluate.beforeAll(async ({ kbnClient, esClient, log }) => {
    log.info('Creating APM error count rule for payment service');

    const ruleResponse = await kbnClient.request<RuleResponse>({
      method: 'POST',
      path: '/api/alerting/rule',
      body: apmErrorCountAIInsight.ruleParams,
    });
    ruleId = ruleResponse.data.id;

    await replayObservabilitySignals(esClient, log, OTEL_DEMO_SNAPSHOT_NAME);

    log.info('Triggering rule run');
    await kbnClient.request<void>({
      method: 'POST',
      path: `/internal/alerting/rule/${ruleId}/_run_soon`,
    });

    log.info('Waiting for alert to be created');
    await new Promise((resolve) => setTimeout(resolve, ALERT_CREATION_WAIT_MS));

    await esClient.indices.refresh({ index: APM_ALERTS_INDEX });

    log.debug('Waiting to make sure all indices are refreshed');
    await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));
    const alertsResponse = await esClient.search({
      index: APM_ALERTS_INDEX,
      query: {
        bool: {
          filter: [
            { term: { 'kibana.alert.rule.uuid': ruleId } },
            { term: { 'kibana.alert.status': 'active' } },
          ],
        },
      },
      size: 1,
    });

    const alertDoc = alertsResponse.hits.hits[0];
    if (!alertDoc) {
      throw new Error(`No alert found for rule ${ruleId}`);
    }
    alertId = alertDoc._id as string;
    log.info(`Found alert with ID: ${alertId}`);
  });

  evaluate('alert analysis correctness', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ai insights: alert analysis',
        description: 'Evaluates correctness of alert AI insight summaries against ground truth',
        examples: [
          {
            input: {
              alertId,
            },
            output: {
              expected: `The alert indicates elevated error rates for the payment service. 
The error count threshold has been exceeded, with PaymentError type errors occurring. 
The alert was triggered because the number of errors exceeded the configured threshold of 1 error within a 5-minute window.
Key observations:
- Service affected: payment
- Error type: PaymentError
- Error message: Payment processing failed
- The errors are occurring on the POST /api/payment transaction`,
            },
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ kbnClient, apmSynthtraceEsClient, esClient, log }) => {
    log.info('Cleaning up indices');
    await Promise.all([
      esClient.deleteByQuery({
        index: APM_ALERTS_INDEX,
        query: { match_all: {} },
        refresh: true,
      }),
      esClient.deleteByQuery({
        index: 'logs-*',
        query: { match_all: {} },
        refresh: true,
      }),
      esClient.deleteByQuery({
        index: 'metrics-*',
        query: { match_all: {} },
        refresh: true,
      }),
      esClient.deleteByQuery({
        index: 'traces-*',
        query: { match_all: {} },
        refresh: true,
      }),
    ]);

    if (ruleId) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/alerting/rule/${ruleId}`,
      });
    }
  });
});
