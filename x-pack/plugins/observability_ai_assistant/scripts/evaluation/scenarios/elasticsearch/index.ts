/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluationFunction } from '../../types';

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
