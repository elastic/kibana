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
import { ESQL_TRANSLATE_ECS_MAPPING_PROMPT } from './prompts';

interface GetEcsMappingNodeParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}

export const getEcsMappingNode = ({
  inferenceClient,
  connectorId,
  logger,
}: GetEcsMappingNodeParams): GraphNode => {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  return async (state) => {
    const elasticRule = {
      title: state.elastic_rule.title,
      description: state.elastic_rule.description,
      query: state.elastic_rule.query,
    };

    const prompt = await ESQL_TRANSLATE_ECS_MAPPING_PROMPT.format({
      field_mapping: SIEM_RULE_MIGRATION_CIM_ECS_MAP,
      splunk_query: state.inline_query,
      elastic_rule: JSON.stringify(elasticRule, null, 2),
    });

    const response = await esqlKnowledgeBaseCaller(prompt);

    const updatedQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    const ecsSummary = response.match(/## Field Mapping Summary[\s\S]*$/)?.[0] ?? '';

    const translationResult = getTranslationResult(updatedQuery);

    return {
      response,
      comments: [ecsSummary],
      translation_finalized: true,
      translation_result: translationResult,
      elastic_rule: {
        ...state.elastic_rule,
        query: updatedQuery,
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
