/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { chatClient } from '../../services';
import { MessageRole } from '../../../../common';

describe('apm', () => {
  it('service summary, troughput, dependencies and errors', async () => {
    let conversation = await chatClient.complete(
      'What is the status of the service elastic-co-frontend?'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What is the average throughput for the elastic-co-frontend service over the past 4 hours?',
        role: MessageRole.User
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What are the downstream dependencies of the opbeans-node service?',
        role: MessageRole.User
      })
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What are the top 2 most frequent errors in the opbeans-node service in the last hour?',
        role: MessageRole.User
      })
    );


    const result = await chatClient.evaluate(conversation, [
      'Uses get_apm_service_summary to obtain the status of the elastic-co-frontend service',
      'Executes get_apm_timeseries to obtain the throughput of the services elastic-co-frontend for the last 4 hours',
      'Gives a summary of the throughput stats for elastic-co-frontend',
      'Provides the downstream dependencies of opbeans-node',
      'Obtains the top 2 frequent errors in the opbeans-node service in the last hour'
    ]);

    expect(result.passed).to.be(true);
  });
  it('services in environment', async () => {
    let conversation = await chatClient.complete(
      'What are the active services in the environment "Synthtrace: logs_and_metrics"?'
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
        content: 'Are there any alert for those services?',
        role: MessageRole.User
      })
    );

    const result = await chatClient.evaluate(conversation, [
      'Responds with the active services in the environment "Synthtrace: logs_and_metrics"',
      'Executes get_apm_timeseries to obtain the error rate of the services for the last 4 hours',
      'Returns the current alerts for the services'
    ]);

    expect(result.passed).to.be(true);
  });
})
