/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import type { AlertInsightParams } from '../src/clients/ai_insight_client';
import { apmErrorCountAIInsight } from '../src/alert_templates/alerts';
import {
  OTEL_DEMO_SNAPSHOT_NAME,
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../src/data_generators/replay';
import { evaluate } from './evaluate_ai_insights';

const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';
const ALERT_CREATION_WAIT_MS = 3000;
const INDEX_REFRESH_WAIT_MS = 2500;

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

    await replayObservabilityDataStreams(esClient, log, OTEL_DEMO_SNAPSHOT_NAME);

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

  evaluate('alert analysis correctness', async ({ aiInsightClient, evaluateDataset }) => {
    await evaluateDataset<AlertInsightParams>({
      getInsight: (params) => aiInsightClient.getAlertInsight(params),
      dataset: {
        name: 'ai insights: alert analysis',
        description: 'Evaluates correctness of alert AI insight summaries against ground truth',
        examples: [
          {
            input: {
              requestPayload: {
                alertId,
              },
              question:
                'Analyze this alert and provide a summary of the likely cause and impact, an assessment, related signals with their relevance, and 2-3 immediate actions an SRE can take.',
            },
            output: {
              expected: `-   Summary: A single handled error was detected in the payment service, specifically related to an invalid token during a payment request. The error appears isolated, with no evidence of broader anomalies or downstream impact.

-   Assessment: The most plausible explanation is a user or client-side issue (invalid token) causing a handled error in the payment service. This is supported by a matching error log and absence of service anomalies or deployment changes. Support is limited to a single error group and no corroborating change points or anomalies.

-   Related signals:

    -   Errors: "Payment request failed. Invalid token. app.loyalty.level=gold" (apmErrors, last seen within alert window, Direct)---handled error, likely user input or session issue.
    -   Anomalies: None detected (apmServiceSummary, alert window, Unrelated)---no evidence of systemic or performance issues.
    -   Change points: None observed (apmServiceSummary, alert window, Unrelated)---no throughput or latency shifts.
    -   Downstream: Only checkout:5050 referenced in error trace; no evidence of propagation to flagd or other services (apmDownstreamDependencies, Indirect).
-   Immediate actions:

    -   Review recent traces for the affected error group to confirm scope and verify if the error is isolated to specific users or requests.
    -   Validate that the error is properly handled and does not impact payment processing for valid tokens.
    -   If no further errors occur, monitor for recurrence but no urgent action is required. If errors increase, investigate token validation logic and upstream authentication flows.`,
            },
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ kbnClient, esClient, log }) => {
    log.debug('Cleaning up indices');
    await Promise.all([
      esClient.deleteByQuery({
        index: APM_ALERTS_INDEX,
        query: { match_all: {} },
        refresh: true,
      }),
      ...(ruleId
        ? [
            kbnClient.request({
              method: 'DELETE',
              path: `/api/alerting/rule/${ruleId}`,
            }),
          ]
        : []),
      cleanObservabilityDataStreams(esClient),
    ]);
  });
});
