/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { chatClient, kibanaClient, synthtraceEsClients, logger } from '../../services';
import {
  apmTransactionRateAIAssistant,
  customThresholdAIAssistantLogCount,
} from '../../alert_templates/templates';
import { MessageRole } from '../../../../common';

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
  });

  it('summary of active alerts', async () => {
    const conversation = await chatClient.complete('Are there any active alerts?');

    const result = await chatClient.evaluate(conversation, [
      'Uses alerts function to retrieve active alerts',
      'Responds with a summary of the current active alerts',
    ]);

    expect(result.passed).to.be(true);
  });

  it('filtered alerts', async () => {
    let conversation = await chatClient.complete(
      'Do I have any active alerts related to "Threshold surpassed in AI Assistant eval"?'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'Do I have any alerts on the service my-service?',
        role: MessageRole.User,
      })
    );

    const result = await chatClient.evaluate(conversation, [
      'Uses alerts function to retrieve active alerts for "Threshold surpassed in AI Assistant eval", uses "filter": "Threshold surpassed in AI Assistant eval" in the alert function',
      'Returns one or more alerts related to "Threshold surpassed in AI Assistant eval", does not return no active alerts related to "Threshold surpassed in AI Assistant eval"',
      'Uses alerts function to filtering on service.name my-service to retrieve active alerts for that service',
      'Returns one or more alerts related to my-service',
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
