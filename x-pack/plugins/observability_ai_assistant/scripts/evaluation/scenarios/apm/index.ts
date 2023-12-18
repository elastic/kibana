/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluationFunction } from '../../types';
import { MessageRole } from '../../../../common';

export const apm_performance: EvaluationFunction = async ({ chatClient }) => {
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


  const evaluation = await chatClient.evaluate(conversation, [
    'Uses get_apm_service_summary to obtain the status of the elastic-co-frontend service',
    'Executes get_apm_timeseries to obtain the throughput of the services elastic-co-frontend for the last 4 hours',
    'Gives a summary of the throughput stats for elastic-co-frontend',
    'Provides the downstream dependencies of opbeans-node',
    'Obtains the top 2 frequent errors in the opbeans-node service in the last hour'
  ]);

  return evaluation;
};

