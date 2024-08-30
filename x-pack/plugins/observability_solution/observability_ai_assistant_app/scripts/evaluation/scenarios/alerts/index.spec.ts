/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import type { RuleResponse } from '@kbn/alerting-plugin/server/routes/schemas/rule/response/types/v1';
import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { chatClient, kibanaClient, synthtraceEsClients, logger } from '../../services';
import {
  apmTransactionRateAIAssistant,
  customThresholdAIAssistantLogCount,
} from '../../alert_templates/templates';

describe('alert function', () => {
  const ruleIds: any[] = [];

  before(async () => {
    logger.info('Creating APM rule');
    const responseApmRule = await kibanaClient.callKibana<RuleResponse>(
      'post',
      { pathname: '/api/alerting/rule' },
      apmTransactionRateAIAssistant.ruleParams
    );
    ruleIds.push(responseApmRule.data.id);

    logger.info('Creating dataview');

    await kibanaClient.callKibana(
      'post',
      { pathname: '/api/content_management/rpc/create' },
      customThresholdAIAssistantLogCount.dataViewParams
    );

    logger.info('Creating logs rule');
    const responseLogsRule = await kibanaClient.callKibana<RuleResponse>(
      'post',
      { pathname: '/api/alerting/rule' },
      customThresholdAIAssistantLogCount.ruleParams
    );
    ruleIds.push(responseLogsRule.data.id);

    logger.debug('Cleaning APM indices');

    await synthtraceEsClients.apmSynthtraceEsClient.clean();

    const myServiceInstance = apm.service('my-service', 'production', 'go').instance('my-instance');

    logger.debug('Indexing synthtrace data');

    await synthtraceEsClients.apmSynthtraceEsClient.index(
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

    logger.debug('Triggering a rule run');

    await Promise.all(
      ruleIds.map((ruleId) =>
        kibanaClient.callKibana<void>('post', {
          pathname: `/internal/alerting/rule/${ruleId}/_run_soon`,
        })
      )
    );

    logger.debug('Waiting 2.5s to make sure all indices are refreshed');

    await new Promise((resolve) => {
      setTimeout(resolve, 2500);
    });
  });

  it('summary of active alerts', async () => {
    const conversation = await chatClient.complete(
      'Are there any active alerts over the last 4 hours?'
    );

    const result = await chatClient.evaluate(conversation, [
      'Correctly uses the `alerts` function to fetch data for the current time range',
      'Retrieves 2 alerts',
      'Responds with a summary of the current active alerts',
    ]);

    expect(result.passed).to.be(true);
  });

  it('filtered alerts', async () => {
    let conversation = await chatClient.complete(
      'Do I have any active threshold alerts related to the AI Assistant?'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'Do I have any alerts on the service my-service?',
        role: MessageRole.User,
      })
    );

    const result = await chatClient.evaluate(conversation, [
      'Uses the get_alerts_dataset_info function',
      'Correctly uses the alerts function without a filter',
      'Returns two alerts related to "Threshold surpassed in AI Assistant eval"',
      'After the second question, uses alerts function to filtering on service.name my-service to retrieve active alerts for that service. The filter should be `service.name:"my-service"` or `service.name:my-service`.',
      'Summarizes the active alerts for the `my-service` service',
    ]);

    expect(result.passed).to.be(true);
  });

  after(async () => {
    await synthtraceEsClients.apmSynthtraceEsClient.clean();

    for (const ruleId of ruleIds) {
      await kibanaClient.callKibana('delete', { pathname: `/api/alerting/rule/${ruleId}` });
    }

    await kibanaClient.callKibana(
      'post',
      { pathname: `/api/content_management/rpc/delete` },
      {
        contentTypeId: 'index-pattern',
        id: customThresholdAIAssistantLogCount.dataViewParams.options.id,
        options: { force: true },
        version: 1,
      }
    );
  });
});
