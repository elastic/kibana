/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import { getEsqlKnowledgeBase } from '../../../../../util/esql_knowledge_base_caller';
import type { GraphNode } from '../../types';
import { RESOLVE_ESQL_ERRORS_TEMPLATE } from './prompts';

interface GetEsqlErrorsNodeParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}

export const getEsqlErrorsNode = ({
  inferenceClient,
  connectorId,
  logger,
}: GetEsqlErrorsNodeParams): GraphNode => {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  return async (state) => {
    const rule = state.elastic_rule;
    const prompt = await RESOLVE_ESQL_ERRORS_TEMPLATE.format({
      esql_errors: state.validation_errors.esql_errors,
      esql_query: rule.query,
    });
    const response = await esqlKnowledgeBaseCaller(prompt);

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    rule.query = esqlQuery;
    return { elastic_rule: rule };
  };
};
