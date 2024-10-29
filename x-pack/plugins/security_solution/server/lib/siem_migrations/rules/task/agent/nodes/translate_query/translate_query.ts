/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import { AIMessage } from '@langchain/core/messages';
import type { GraphNode } from '../../types';
import { getEsqlKnowledgeBase } from './esql_knowledge_base_caller';
import { getEsqlTranslationPrompt } from './prompt';

interface GetTranslateQueryNodeParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}

export const getTranslateQueryNode = ({
  inferenceClient,
  connectorId,
  logger,
}: GetTranslateQueryNodeParams): GraphNode => {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  return async (state) => {
    const input = getEsqlTranslationPrompt(state);
    const response = await esqlKnowledgeBaseCaller(input);
    return { messages: [new AIMessage(response)] };
  };
};
