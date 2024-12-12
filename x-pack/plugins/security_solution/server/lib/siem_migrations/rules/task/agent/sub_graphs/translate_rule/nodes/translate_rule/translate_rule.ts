/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import { SiemMigrationRuleTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import { getEsqlKnowledgeBase } from '../../../../../util/esql_knowledge_base_caller';
import type { GraphNode } from '../../types';
import { SIEM_RULE_MIGRATION_CIM_ECS_MAP } from './cim_ecs_map';
import { ESQL_TRANSLATION_PROMPT } from './prompts';

interface GetTranslateRuleNodeParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}

export const getTranslateRuleNode = ({
  inferenceClient,
  connectorId,
  logger,
}: GetTranslateRuleNodeParams): GraphNode => {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  return async (state) => {
    const indexPatterns = state.integrations
      .flatMap((integration) =>
        integration.data_streams.map((dataStream) => dataStream.index_pattern)
      )
      .join(',');
    const integrationIds = state.integrations.map((integration) => integration.id);

    const prompt = await ESQL_TRANSLATION_PROMPT.format({
      title: state.original_rule.title,
      description: state.original_rule.description,
      field_mapping: SIEM_RULE_MIGRATION_CIM_ECS_MAP,
      inline_query: state.inline_query,
      indexPatterns,
    });
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
        integration_ids: integrationIds,
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
