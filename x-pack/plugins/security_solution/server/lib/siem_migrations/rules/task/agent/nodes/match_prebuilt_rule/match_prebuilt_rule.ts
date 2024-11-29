/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { SiemMigrationRuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { GraphNode } from '../../types';
import { filterPrebuiltRules, type PrebuiltRulesMapByName } from '../../../util/prebuilt_rules';
import { MATCH_PREBUILT_RULE_PROMPT } from './prompts';

interface GetMatchPrebuiltRuleNodeParams {
  model: ChatModel;
  prebuiltRulesMap: PrebuiltRulesMapByName;
  logger: Logger;
}

export const getMatchPrebuiltRuleNode =
  ({ model, prebuiltRulesMap }: GetMatchPrebuiltRuleNodeParams): GraphNode =>
  async (state) => {
    const mitreAttackIds = state.original_rule.mitre_attack_ids;
    if (!mitreAttackIds?.length) {
      return {};
    }
    const filteredPrebuiltRulesMap = filterPrebuiltRules(prebuiltRulesMap, mitreAttackIds);
    if (filteredPrebuiltRulesMap.size === 0) {
      return {};
    }

    const outputParser = new StringOutputParser();
    const matchPrebuiltRule = MATCH_PREBUILT_RULE_PROMPT.pipe(model).pipe(outputParser);

    const elasticSecurityRules = Array(filteredPrebuiltRulesMap.keys()).join('\n');
    const response = await matchPrebuiltRule.invoke({
      elasticSecurityRules,
      ruleTitle: state.original_rule.title,
    });
    const cleanResponse = response.trim();
    if (cleanResponse === 'no_match') {
      return {};
    }

    const result = filteredPrebuiltRulesMap.get(cleanResponse);
    if (result != null) {
      return {
        elastic_rule: {
          title: result.rule.name,
          description: result.rule.description,
          prebuilt_rule_id: result.rule.rule_id,
          id: result.installedRuleId,
          translation_result: SiemMigrationRuleTranslationResult.FULL,
        },
      };
    }

    return {};
  };
