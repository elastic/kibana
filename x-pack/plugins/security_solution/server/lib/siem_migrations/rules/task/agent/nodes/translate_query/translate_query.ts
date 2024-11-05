/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
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

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    const summary = response.match(/## Migration Summary[\s\S]*$/)?.[0] ?? '';

    const translationState = getTranslationState(esqlQuery);

    return {
      response,
      comments: [summary],
      translation_state: translationState,
      elastic_rule: {
        title: state.original_rule.title,
        description: state.original_rule.description,
        severity: 'low',
        query: esqlQuery,
        query_language: 'esql',
      },
    };
  };
};

const getTranslationState = (esqlQuery: string) => {
  if (esqlQuery.match(/\[(macro|lookup):[\s\S]*\]/)) {
    return 'partial';
  }
  return 'complete';
};
