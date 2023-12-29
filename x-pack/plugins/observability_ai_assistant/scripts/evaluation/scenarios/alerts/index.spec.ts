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

import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { apm_transaction_rate_AIAssistant, custom_threshold_AIAssistant_log_count } from '@kbn/observability-alerting-test-data'



describe('alert function', () => {
  let rule_ids: any[] = []
  before(async () => {
    const myServiceInstance = apm
      .service('my-service', 'production', 'go')
      .instance('my-instance');

    await synthtraceEsClients.apmSynthtraceEsClient.index(
      timerange(moment().subtract(15, 'minutes'), moment())
        .interval('1m')
        .rate(10)
        .generator((timestamp) =>
          myServiceInstance
            .transaction('GET /api')
            .timestamp(timestamp)
            .duration(50)
            .outcome('success')
        )
    );

    let response_apm_rule = await kibanaClient.callKibana("post",
      { pathname: "/api/alerting/rule" },
      apm_transaction_rate_AIAssistant.ruleParams,
    )
    rule_ids.push(response_apm_rule.data.id)

    let response_logs_rule = await kibanaClient.callKibana("post",
      { pathname: "/api/alerting/rule" },
      custom_threshold_AIAssistant_log_count.ruleParams,
    )
    rule_ids.push(response_logs_rule.data.id)

  });

  it('summary of active alerts', async () => {
    let conversation = await chatClient.complete(
      'Do I have any active alerts?'
    );

    const result = await chatClient.evaluate(conversation, [
      'Uses alerts function to retrieve active alerts',
      'Responds with a summary of the current active alerts',
    ]);

    expect(result.passed).to.be(true);
  });

  it('filtered alerts', async () => {
    let conversation = await chatClient.complete(
      'Do I have any active alerts related to logs_synth?'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'Do I have any alerts on the service my-service?',
        role: MessageRole.User
      })
    );


    const result = await chatClient.evaluate(conversation, [
      'Uses alerts function to retrieve active alerts for logs_synth, does not filter on service.name="logs_synth" in the alert function',
      'Returns one or more alerts related to logs_synth',
      'Uses alerts function to filtering on service.name my-service to retrieve active alerts for that service',
      'Returns one or more alerts related to my-service',
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
});
