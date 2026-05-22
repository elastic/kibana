/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import type { TransactionDurationRuleParams } from '@kbn/response-ops-rule-params/transaction_duration';
import type { AlertInsightParams } from '../../src/clients/ai_insight_client';
import {
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../../src/data_generators/replay';
import { getAlertScenarios, type AlertScenario } from '../../src/scenarios/alert_scenarios';
import { logTransactionDurationAlertPrerequisites } from '../../src/test_helpers/log_alert_rule_prerequisites';
import { waitForActiveAlert } from '../../src/test_helpers/wait_for_active_alert';
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
      log.info(`Replaying scenario: ${scenario.id}`);
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        scenario.snapshotName,
        scenario.gcs
      );

      log.info(`Creating alerting rule for scenario: ${scenario.id}`);
      const ruleResponse = await kbnClient.request<RuleResponse>({
        method: 'POST',
        path: '/api/alerting/rule',
        body: scenario.alertRule.ruleParams,
      });
      ruleId = ruleResponse.data.id;

      if (scenario.alertRule.ruleParams.rule_type_id !== 'apm.transaction_duration') {
        throw new Error(
          `Alert prerequisites logging only supports apm.transaction_duration (got ${scenario.alertRule.ruleParams.rule_type_id})`
        );
      }
      const ruleParams = scenario.alertRule.ruleParams.params as TransactionDurationRuleParams;

      const runAlertPrerequisitesDiagnostics = () =>
        logTransactionDurationAlertPrerequisites({
          esClient,
          log,
          ruleParams,
          ruleId,
          alertsIndex: scenario.alertRule.alertsIndex,
          replayedIndices: replayResult.reindexedIndices,
        });

      await runAlertPrerequisitesDiagnostics();

      log.info('Triggering rule run');
      await kbnClient.request<void>({
        method: 'POST',
        path: `/internal/alerting/rule/${ruleId}/_run_soon`,
      });

      log.info('Waiting for active alert');
      alertId = await waitForActiveAlert({
        esClient,
        alertsIndex: scenario.alertRule.alertsIndex,
        ruleId,
        log,
        onDiagnostics: runAlertPrerequisitesDiagnostics,
      });
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
          conflicts: 'proceed',
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
