/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluationFunction } from '../../types';
import { MessageRole } from '../../../../common';

export const alerts_summary: EvaluationFunction = async ({ chatClient }) => {
  let conversation = await chatClient.complete(
    'Do I have any active alerts?'
  );

  const evaluation = await chatClient.evaluate(conversation, [
    'Uses alerts function to retrieve active alerts',
    'Responds with a summary of the current active alerts',
  ]);

  return evaluation;
};

export const alerts_filtered: EvaluationFunction = async ({ chatClient }) => {
  let conversation = await chatClient.complete(
    'Do I have any active alerts related to logs_synth?'
  );

  conversation = await chatClient.complete(
    conversation.conversationId!,
    conversation.messages.concat({
      content: 'Do I have any alerts on the service synth-service-0?',
      role: MessageRole.User
    })
  );


  const evaluation = await chatClient.evaluate(conversation, [
    'Uses alerts function to retrieve active alerts for logs_synth',
    'Uses alerts function to filtering on service.name synth-service-0 to retrieve active alerts for that service',
  ]);

  return evaluation;
};
