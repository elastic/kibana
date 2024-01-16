/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { chatClient, kibanaClient, synthtraceEsClients } from '../../services';
import { MessageRole } from '../../../../common';
import { apm_error_count_AIAssistant } from '../../alert_templates';

import moment from 'moment';
import { apm, timerange, serviceMap } from '@kbn/apm-synthtrace-client';

describe('apm', () => {
  let rule_ids: any[] = []
  before(async () => {

    await synthtraceEsClients.apmSynthtraceEsClient.clean();

    await synthtraceEsClients.apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator(
          serviceMap({
            services: [
              { 'ai-assistant-service-front': 'go' },
              { 'ai-assistant-service-back': 'python' },
            ],
            environment: "test",
            definePaths([main, reco]) {
              return [
                [
                  [main, 'fetchReco'],
                  [reco, 'GET /api'],
                ],
                [reco]
              ];
            },
          })
        ));

    const aiAssistantService = apm
      .service('ai-assistant-service', 'test', 'go')
      .instance('my-instance');

    const aiAssistantService_python = apm
      .service('ai-assistant-service-reco', 'test', 'python')
      .instance('my-instance');

    await synthtraceEsClients.apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator((timestamp) =>
          aiAssistantService
            .transaction('getReco')
            .timestamp(timestamp)
            .duration(50)
            .outcome('success')
        ));

    await synthtraceEsClients.apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator((timestamp) =>
          aiAssistantService
            .transaction('removeReco')
            .timestamp(timestamp)
            .duration(50)
            .failure()
            .errors(
              aiAssistantService.error({ message: "ERROR removeReco not suported", type: 'My Type' }).timestamp(timestamp)
            )
        ));

    await synthtraceEsClients.apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator((timestamp) =>
          aiAssistantService
            .transaction('GET /api_v1')
            .timestamp(timestamp)
            .duration(50)
            .outcome('success')
        ));

    await synthtraceEsClients.apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator((timestamp) =>
          aiAssistantService_python
            .transaction('GET /api_v2')
            .timestamp(timestamp)
            .duration(50)
            .failure()
            .errors(
              aiAssistantService_python.error({ message: "ERROR api_v2 not supported", type: 'My Type' }).timestamp(timestamp)
            )
        ));

    let response_apm_rule = await kibanaClient.callKibana("post",
      { pathname: "/api/alerting/rule" },
      apm_error_count_AIAssistant.ruleParams,
    )
    rule_ids.push(response_apm_rule.data.id)

  });

  it('service summary, troughput, dependencies and errors', async () => {
    let conversation = await chatClient.complete(
      'What is the status of the service ai-assistant-service in the test environment?'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What is the average throughput for the ai-assistant-service service over the past 4 hours?',
        role: MessageRole.User
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What are the downstream dependencies of the ai-assistant-service-front service?',
        role: MessageRole.User
      })
    );


    const result = await chatClient.evaluate(conversation, [
      'Uses get_apm_service_summary to obtain the status of the ai-assistant-service service',
      'Executes get_apm_timeseries to obtain the throughput of the services ai-assistant-service-front for the last 4 hours',
      'Gives a summary of the throughput stats for ai-assistant-service',
      'Provides the downstream dependencies of ai-assistant-service',
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
        role: MessageRole.User
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What are the top 2 most frequent errors in the services in the test environment in the last hour?',
        role: MessageRole.User
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'Are there any alert for those services?',
        role: MessageRole.User
      })
    );


    const result = await chatClient.evaluate(conversation, [
      'Responds with the active services in the environment "test"',
      'Executes get_apm_timeseries to obtain the error rate of the services for the last 4 hours, for the specified services in test environment',
      'Obtains the top 2 frequent errors of the services in the last hour, for the specified services in test environment',
      'Returns the current alerts for the services, for the specified services in test environment'
    ]);

    expect(result.passed).to.be(true);
  });

  after(async () => {
    await synthtraceEsClients.apmSynthtraceEsClient.clean();

    for (let i in rule_ids) {
      await kibanaClient.callKibana("delete",
        { pathname: `/api/alerting/rule/${rule_ids[i]}` },
      )
    }

  })
})
