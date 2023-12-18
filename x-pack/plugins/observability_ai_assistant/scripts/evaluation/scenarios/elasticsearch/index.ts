/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluationFunction } from '../../types';
import { MessageRole } from '../../../../common';

export const health: EvaluationFunction = async ({ chatClient }) => {
  const conversation = await chatClient.complete(
    'Can you tell me what the state of my Elasticsearch cluster is?'
  );

  const evaluation = await chatClient.evaluate(conversation, [
    'Calls the Elasticsearch function with method: GET and path: _cluster/health',
    'Describes the cluster status based on the response from the Elasticsearch function',
  ]);

  return evaluation;
};

export const license: EvaluationFunction = async ({ chatClient }) => {
  const conversation = await chatClient.complete(
    'What is my clusters license?'
  );

  const evaluation = await chatClient.evaluate(conversation, [
    'Calls the Elasticsearch function',
    'Returns the cluster license based on the response from the Elasticsearch function',
  ]);

  return evaluation;
};

export const index_management_count: EvaluationFunction = async ({ chatClient }) => {
  const conversation = await chatClient.complete(
    'How many documents are in the index .kibana-observability-ai-assistant-kb-*?'
  );

  const evaluation = await chatClient.evaluate(conversation, [
    'Calls the Elasticsearch function',
    'Finds how many documents are in that index',
  ]);

  return evaluation;
};

export const index_management_index_docs: EvaluationFunction = async ({ chatClient }) => {
  let conversation = await chatClient.complete(
    'Delete the testing_ai_assistant index if it exists'
  );

  conversation = await chatClient.complete(
    conversation.conversationId!,
    conversation.messages.concat({
      content: 'Create a new index called testing_ai_assistant what will have two documents, one for the test_suite alerts with message "This test is for alerts" and another one for the test_suite esql with the message "This test is for esql"',
      role: MessageRole.User
    })
  );

  conversation = await chatClient.complete(
    conversation.conversationId!,
    conversation.messages.concat({
      content: 'What are the fields types for the index testing_ai_assistant?',
      role: MessageRole.User
    })
  );

  const evaluation = await chatClient.evaluate(conversation, [
    'Checks if the testing_ai_assistant index exists, and if it does deletes it',
    'Calls the Elasticsearch function to create the index testing_ai_assistant and add the documents to it',
    'Successfully created index and adds two documents to it',
    'Calls get_dataset_info and retrieves the field types of the index',
  ]);

  return evaluation;
};

export const index_stats: EvaluationFunction = async ({ chatClient }) => {
  let conversation = await chatClient.complete(
    'What are the the store stats of the index .kibana-observability-ai-assistant-kb-*?'
  );

  conversation = await chatClient.complete(
    conversation.conversationId!,
    conversation.messages.concat({
      content: 'What are the the store stats of the index?',
      role: MessageRole.User
    })
  );

  const evaluation = await chatClient.evaluate(conversation, [
    'Calls the Elasticsearch function with method: .kibana-observability-ai-assistant-kb-*/_stats',
    'Returns the index stats',
    'Calls the Elasticsearch function with method: .kibana-observability-ai-assistant-kb-*/_stats/store',
    'Returns the index store stats',
  ]);

  return evaluation;
};
