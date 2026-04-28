/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import pRetry from 'p-retry';
import type { AlertInsightParams } from '../../src/clients/ai_insight_client';
import {
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../../src/data_generators/replay';
import { getAlertScenarios, type AlertScenario } from '../../src/scenarios/alert_scenarios';
import { evaluate } from './evaluate_ai_insights';

const scenarios = getAlertScenarios();

for (const scenario of scenarios) {
  createScenarioTest(scenario);
}

function createScenarioTest(scenario: AlertScenario) {
  const scenarioLabel = `Alert AI Insights - ${scenario.id} (${scenario.snapshotName})`;

  evaluate.describe(scenarioLabel, { tag: tags.serverless.observability.complete }, () => {
    let ruleId: string;
    let alertId: string;
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ kbnClient, esClient, log }) => {
      log.info(`Creating alerting rule for scenario: ${scenario.id}`);

      const ruleResponse = await kbnClient.request<RuleResponse>({
        method: 'POST',
        path: '/api/alerting/rule',
        body: scenario.alertRule.ruleParams,
      });
      ruleId = ruleResponse.data.id;

      log.info(`Replaying scenario: ${scenario.id}`);
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        scenario.snapshotName,
        scenario.gcs
      );

      log.info('Polling for alert to be created');

      alertId = await pRetry(
        async () => {
          await kbnClient.request<void>({
            method: 'POST',
            path: `/internal/alerting/rule/${ruleId}/_run_soon`,
          });

          await esClient.indices.refresh({ index: scenario.alertRule.alertsIndex });

          const alertsResponse = await esClient.search({
            index: scenario.alertRule.alertsIndex,
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
            throw new Error('Alert not yet available');
          }
          return alertDoc._id as string;
        },
        {
          retries: 10,
          factor: 2,
          minTimeout: 2000,
          maxTimeout: 15_000,
          onFailedAttempt: (error) => {
            if (error.retriesLeft === 0) {
              log.error(
                `No alert found for rule ${ruleId} in scenario ${scenario.id} after ${error.attemptNumber} attempts`
              );
            } else {
              log.debug(`Alert not yet available (attempt ${error.attemptNumber}); retrying...`);
            }
          },
        }
      );

      log.info(`Found alert with ID: ${alertId}`);
    });

    evaluate(
      `alert analysis (${scenario.id}, ${scenario.snapshotName})`,
      async ({ aiInsightClient, evaluateDataset }) => {
        await evaluateDataset<AlertInsightParams>({
          getInsight: (params) => aiInsightClient.getAlertInsight(params),
          dataset: {
            name: `ai insights: alert analysis (${scenario.id}, ${scenario.snapshotName})`,
            description: `Evaluates correctness of alert AI insight summaries for ${scenario.id} (snapshot: ${scenario.snapshotName})`,
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
                  expected: scenario.expectedOutput,
                },
              },
            ],
          },
        });
      }
    );

    evaluate.afterAll(async ({ kbnClient, esClient, log }) => {
      log.debug('Cleaning up indices');
      await Promise.all([
        esClient.deleteByQuery({
          index: scenario.alertRule.alertsIndex,
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
        cleanObservabilityDataStreams(esClient, replayResult, log),
      ]);
    });
  });
}
