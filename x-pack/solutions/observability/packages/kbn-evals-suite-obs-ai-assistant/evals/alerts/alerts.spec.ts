/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import moment from 'moment';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  apmTransactionRateAIAssistant,
  customThresholdAIAssistantLogCount,
} from '../../src/alert_templates/alerts';
import { evaluate } from '../../src/evaluate';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/alerts/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

evaluate.describe('Alerts', { tag: '@svlOblt' }, () => {
  const ruleIds: string[] = [];

  evaluate.beforeAll(async ({ kbnClient, apmSynthtraceEsClient, log }) => {
    log.info('Creating APM rule');
    const responseApmRule = await kbnClient.request<RuleResponse>({
      method: 'POST',
      path: '/api/alerting/rule',
      body: apmTransactionRateAIAssistant.ruleParams,
    });
    ruleIds.push(responseApmRule.data.id);

    log.info('Creating dataview');
    try {
      await kbnClient.request({
        method: 'POST',
        path: '/api/content_management/rpc/create',
        body: customThresholdAIAssistantLogCount.dataViewParams,
      });
    } catch (error) {
      if (error?.status === 409) {
        log.info('Data view already exists, skipping creation');
      } else {
        throw error;
      }
    }

    log.info('Creating logs rule');
    const responseLogsRule = await kbnClient.request<RuleResponse>({
      method: 'POST',
      path: '/api/alerting/rule',
      body: customThresholdAIAssistantLogCount.ruleParams,
    });
    ruleIds.push(responseLogsRule.data.id);

    log.debug('Cleaning APM indices');
    await apmSynthtraceEsClient.clean();

    const myServiceInstance = apm.service('my-service', 'production', 'go').instance('my-instance');
    log.debug('Indexing synthtrace data');
    await apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator((timestamp) => [
          myServiceInstance
            .transaction('GET /api')
            .timestamp(timestamp)
            .duration(50)
            .failure()
            .errors(
              myServiceInstance
                .error({ message: 'errorMessage', type: 'My Type' })
                .timestamp(timestamp)
            ),
          myServiceInstance
            .transaction('GET /api')
            .timestamp(timestamp)
            .duration(50)
            .outcome('success'),
        ])
    );

    log.debug('Triggering a rule run');
    await Promise.all(
      ruleIds.map((ruleId) =>
        kbnClient.request<void>({
          method: 'POST',
          path: `/internal/alerting/rule/${ruleId}/_run_soon`,
        })
      )
    );

    log.debug('Waiting 2.5s to make sure all indices are refreshed');
    await new Promise((resolve) => setTimeout(resolve, 2500));
  });

  evaluate('summary of active alerts', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'alerts: active alerts',
        description: 'Summarizes currently active alerts over the last 4 hours',
        examples: [
          {
            input: {
              question: 'Are there any active alerts over the last 4 hours?',
            },
            output: {
              criteria: [
                'Correctly uses the `alerts` function to fetch data for the current time range',
                'Retrieves 2 alerts',
                'Responds with a summary of the current active alerts',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('filtered alerts', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'alerts: filtered alerts',
        description:
          'Checks threshold alerts and then filters by service.name:"my-service" or within the same prompt',
        examples: [
          {
            input: {
              question: 'Do I have any active threshold alerts for the service my-service?',
            },
            output: {
              criteria: [
                'Uses the get_alerts_dataset_info function',
                'Correctly uses the alerts function',
                'Returns two alerts related to threshold',
                'After the second question, uses alerts function to filtering on service.name my-service to retrieve active alerts for that service. The filter should be `service.name:"my-service"` or `service.name:my-service`.',
                'Summarizes the active alerts for the `my-service` service',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ kbnClient, apmSynthtraceEsClient, esClient }) => {
    await apmSynthtraceEsClient.clean();
    await esClient.deleteByQuery({
      index: '.alerts-observability-*',
      query: {
        match_all: {},
      },
      refresh: true,
    });

    for (const ruleId of ruleIds) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/alerting/rule/${ruleId}`,
      });
    }

    await kbnClient.request({
      method: 'POST',
      path: `/api/content_management/rpc/delete`,
      body: {
        contentTypeId: customThresholdAIAssistantLogCount.dataViewParams.contentTypeId,
        id: customThresholdAIAssistantLogCount.dataViewParams.options.id,
        options: { force: true },
        version: 1,
      },
    });
  });
});
