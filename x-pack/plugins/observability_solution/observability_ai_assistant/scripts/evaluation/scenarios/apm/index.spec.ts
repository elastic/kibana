/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import moment from 'moment';
import { apm, timerange, serviceMap } from '@kbn/apm-synthtrace-client';
import { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import { chatClient, kibanaClient, synthtraceEsClients } from '../../services';
import { MessageRole } from '../../../../common';
import { apmErrorCountAIAssistant } from '../../alert_templates/templates';

describe('apm', () => {
  const ruleIds: any[] = [];
  before(async () => {
    const responseApmRule = await kibanaClient.callKibana<RuleResponse>(
      'post',
      { pathname: '/api/alerting/rule' },
      apmErrorCountAIAssistant.ruleParams
    );
    ruleIds.push(responseApmRule.data.id);

    await synthtraceEsClients.apmSynthtraceEsClient.clean();

    const serviceMapCallback = serviceMap({
      services: [{ 'ai-assistant-service-front': 'go' }, { 'ai-assistant-service-back': 'python' }],
      environment: 'test',
      definePaths([main, reco]) {
        return [
          [
            [main, 'fetchReco'],
            [reco, 'GET /api'],
          ],
          [reco],
        ];
      },
    });

    const aiAssistantService = apm
      .service('ai-assistant-service', 'test', 'go')
      .instance('my-instance');

    const aiAssistantServicePython = apm
      .service('ai-assistant-service-reco', 'test', 'python')
      .instance('my-instance');

    await synthtraceEsClients.apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator((timestamp) => {
          return [
            ...serviceMapCallback(timestamp),
            aiAssistantService
              .transaction('getReco')
              .timestamp(timestamp)
              .duration(50)
              .outcome('success'),
            aiAssistantService
              .transaction('removeReco')
              .timestamp(timestamp)
              .duration(50)
              .failure()
              .errors(
                aiAssistantService
                  .error({ message: 'ERROR removeReco not suported', type: 'My Type' })
                  .timestamp(timestamp)
              ),
            aiAssistantService
              .transaction('GET /api_v1')
              .timestamp(timestamp)
              .duration(50)
              .outcome('success'),
            aiAssistantServicePython
              .transaction('GET /api_v2')
              .timestamp(timestamp)
              .duration(50)
              .failure()
              .errors(
                aiAssistantServicePython
                  .error({ message: 'ERROR api_v2 not supported', type: 'My Type' })
                  .timestamp(timestamp)
              ),
          ];
        })
    );
  });

  it('service summary, troughput, dependencies and errors', async () => {
    let conversation = await chatClient.complete(
      'What is the status of the service ai-assistant-service in the test environment?'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content:
          'What is the average throughput for the ai-assistant-service service over the past 4 hours?',
        role: MessageRole.User,
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What are the downstream dependencies of the ai-assistant-service-front service?',
        role: MessageRole.User,
      })
    );

    const result = await chatClient.evaluate(conversation, [
      'Uses get_apm_service_summary to obtain the status of the ai-assistant-service service',
      'Executes get_apm_timeseries to obtain the throughput of the services ai-assistant-service for the last 4 hours',
      'Gives a summary of the throughput stats for ai-assistant-service',
      'Provides the downstream dependencies of ai-assistant-service-front',
    ]);

    expect(result.passed).to.be(true);
  });
  it('services in environment', async () => {
    let conversation = await chatClient.complete(
      'What are the active services in the environment "test"?'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What is the average error rate per service over the past 4 hours?',
        role: MessageRole.User,
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content:
          'What are the top 2 most frequent errors in the services in the test environment in the last hour?',
        role: MessageRole.User,
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'Are there any alert for those services?',
        role: MessageRole.User,
      })
    );

    const result = await chatClient.evaluate(conversation, [
      'Responds with the active services in the environment "test"',
      'Executes get_apm_timeseries to obtain the error rate of the services for the last 4 hours, for the specified services in test environment',
      'Obtains the top 2 frequent errors of the services in the last hour, for the specified services in test environment',
      'Returns the current alerts for the services, for the specified services in test environment',
    ]);

    expect(result.passed).to.be(true);
  });

  after(async () => {
    await synthtraceEsClients.apmSynthtraceEsClient.clean();

    for (const ruleId of ruleIds) {
      await kibanaClient.callKibana('delete', { pathname: `/api/alerting/rule/${ruleId}` });
    }
  });
});
