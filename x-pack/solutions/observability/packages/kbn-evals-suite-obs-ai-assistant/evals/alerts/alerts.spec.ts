/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEvaluateAlerts, EvaluateAlerts } from './evaluate_alerts';
import { evaluate as base } from '../../src/evaluate';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import {
  apmErrorCountAIAssistant,
  apmTransactionRateAIAssistant,
  customThresholdAIAssistantLogCount,
} from './templates';

const evaluate = base.extend<{
  evaluateAlerts: EvaluateAlerts;
}>({
  evaluateAlerts: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateAlerts({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Alerts', { tag: '@svlOblt' }, () => {
  const ruleIds: string[] = [];

  evaluate.beforeAll(async ({ kbnClient, apmSynthtraceEsClient }) => {
    const responseApmRule = await kbnClient.request<RuleResponse>({
      method: 'POST',
      path: '/api/alerting/rule',
      body: apmTransactionRateAIAssistant.ruleParams,
    });
    ruleIds.push(responseApmRule.data.id);

    const responseApmAIAssistantRule = await kbnClient.request<RuleResponse>({
      method: 'POST',
      path: '/api/alerting/rule',
      body: apmErrorCountAIAssistant.ruleParams,
    });
    ruleIds.push(responseApmAIAssistantRule.data.id);

    try {
      await kbnClient.request({
        method: 'POST',
        path: '/api/content_management/rpc/create',
        body: customThresholdAIAssistantLogCount.dataViewParams,
      });
    } catch (error: any) {
      if (error?.status === 409) {
      } else {
        throw error;
      }
    }

    const responseLogsRule = await kbnClient.request<RuleResponse>({
      method: 'POST',
      path: '/api/alerting/rule',
      body: customThresholdAIAssistantLogCount.ruleParams,
    });
    ruleIds.push(responseLogsRule.data.id);

    const myServiceInstance = apm.service('my-service', 'production', 'go').instance('my-instance');

    await apmSynthtraceEsClient.index(
      timerange(moment().subtract(2, 'hours'), moment())
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

    await Promise.all(
      ruleIds.map((ruleId) =>
        kbnClient.request<void>({
          method: 'POST',
          path: `/internal/alerting/rule/${ruleId}/_run_soon`,
        })
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 2500));
  });

  evaluate('summary of active alerts', async ({ evaluateAlerts }) => {
    await evaluateAlerts({
      dataset: {
        name: 'alerts_summary_active',
        description: 'Summarizes currently active alerts over the last 4 hours',
        examples: [
          {
            input: {
              question: 'Are there any active alerts over the last 4 hours?',
            },
            output: {
              criteria: [
                'Correctly uses the `alerts` function to fetch data for the current time range',
                'Retrieves exactly 2 alerts',
                'Responds with a summary of the current active alerts',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('filtered alerts', async ({ evaluateAlerts }) => {
    await evaluateAlerts({
      dataset: {
        name: 'alerts_filtered',
        description:
          'Checks threshold alerts and then filters by service.name:"my-service" or within the same prompt',
        examples: [
          {
            input: {
              question:
                'Do I have any active threshold alerts for the service my-service? Summarize the active alerts.',
            },
            output: {
              criteria: [
                'Uses the get_alerts_dataset_info function',
                'Correctly uses the alerts function',
                'Returns exactly two alerts related to threshold for service "my-service" and no alerts for other services',
                'Filters on service.name my-service using `service.name:"my-service"` or `service.name:my-service`',
                'Summarizes the active alerts for the `my-service` service',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ kbnClient, apmSynthtraceEsClient }) => {
    await apmSynthtraceEsClient.clean();

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
