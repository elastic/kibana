/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import { SiemMigrationRuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { GraphNode } from '../../types';
import { MATCH_PREBUILT_RULE_PROMPT } from './prompts';

interface GetMatchPrebuiltRuleNodeParams {
  model: ChatModel;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

interface GetMatchedRuleResponse {
  match: string;
}

export const getMatchPrebuiltRuleNode =
  ({ model, ruleMigrationsRetriever }: GetMatchPrebuiltRuleNodeParams): GraphNode =>
  async (state) => {
    const query = state.semantic_query;
    const prebuiltRules = await ruleMigrationsRetriever.prebuiltRules.getRules(query);

    const outputParser = new JsonOutputParser();
    const matchPrebuiltRule = MATCH_PREBUILT_RULE_PROMPT.pipe(model).pipe(outputParser);

    const elasticSecurityRules = prebuiltRules.map((rule) => {
      return {
        name: rule.name,
        description: rule.description,
      };
    });

    const response = (await matchPrebuiltRule.invoke({
      rules: JSON.stringify(elasticSecurityRules, null, 2),
      ruleTitle: state.original_rule.title,
    })) as GetMatchedRuleResponse;
    if (response.match) {
      const matchedRule = prebuiltRules.find((r) => r.name === response.match);
      if (matchedRule) {
        return {
          elastic_rule: {
            title: matchedRule.name,
            description: matchedRule.description,
            prebuilt_rule_id: matchedRule.rule_id,
          },
          translation_result: SiemMigrationRuleTranslationResult.FULL,
        };
      }
    }
    return {};
  };
