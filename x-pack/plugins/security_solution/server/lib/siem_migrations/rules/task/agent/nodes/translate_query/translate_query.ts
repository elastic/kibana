/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { isEmpty } from 'lodash/fp';
import type { GraphNode } from '../../types';
import { getEsqlKnowledgeBase } from './esql_knowledge_base_caller';
import { getReplaceQueryResourcesPrompt } from './prompts/replace_resources_prompt';
import { getEsqlTranslationPrompt } from './prompts/esql_translation_prompt';
import { SiemMigrationRuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { RuleResourceRetriever } from '../../../util/rule_resource_retriever';
import type { ChatModel } from '../../../util/actions_client_chat';

interface GetTranslateQueryNodeParams {
  model: ChatModel;
  inferenceClient: InferenceClient;
  resourceRetriever: RuleResourceRetriever;
  connectorId: string;
  logger: Logger;
}

export const getTranslateQueryNode = ({
  model,
  inferenceClient,
  resourceRetriever,
  connectorId,
  logger,
}: GetTranslateQueryNodeParams): GraphNode => {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  return async (state) => {
    let query = state.original_rule.query;

    const resources = await resourceRetriever.getResources(state.original_rule);
    if (!isEmpty(resources)) {
      const replaceQueryResourcesPrompt = getReplaceQueryResourcesPrompt(state, resources);
      const stringParser = new StringOutputParser();
      query = await model.pipe(stringParser).invoke(replaceQueryResourcesPrompt);
    }

    const prompt = getEsqlTranslationPrompt(state, query);
    const response = await esqlKnowledgeBaseCaller(prompt);

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    const summary = response.match(/## Migration Summary[\s\S]*$/)?.[0] ?? '';

    const translationResult = getTranslationResult(esqlQuery);

    return {
      response,
      comments: [summary],
      translation_result: translationResult,
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

const getTranslationResult = (esqlQuery: string): SiemMigrationRuleTranslationResult => {
  if (esqlQuery.match(/\[(macro|lookup):[\s\S]*\]/)) {
    return SiemMigrationRuleTranslationResult.PARTIAL;
  }
  return SiemMigrationRuleTranslationResult.FULL;
};
