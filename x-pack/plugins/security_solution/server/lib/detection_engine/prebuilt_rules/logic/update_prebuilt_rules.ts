/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient, PartialRule } from '@kbn/alerting-plugin/server';

import type { PrebuiltRuleToInstall } from '../../../../../common/detection_engine/prebuilt_rules';
import { transformAlertToRuleAction } from '../../../../../common/detection_engine/transform_actions';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../common/constants';

import { legacyMigrate } from '../../rule_management';
import { createRules } from '../../rule_management/logic/crud/create_rules';
import { readRules } from '../../rule_management/logic/crud/read_rules';
import { patchRules } from '../../rule_management/logic/crud/patch_rules';
import { deleteRules } from '../../rule_management/logic/crud/delete_rules';

import type { IRuleExecutionLogForRoutes } from '../../rule_monitoring';
import type { RuleParams } from '../../rule_schema';

import { PrepackagedRulesError } from '../api/install_prebuilt_rules_and_timelines/route';

/**
 * Updates existing prebuilt rules given a set of rules and output index.
 * This implements a chunked approach to not saturate network connections and
 * avoid being a "noisy neighbor".
 * @param rulesClient Alerting client
 * @param spaceId Current user spaceId
 * @param rules The rules to apply the update for
 */
export const updatePrebuiltRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: PrebuiltRuleToInstall[],
  ruleExecutionLog: IRuleExecutionLogForRoutes
): Promise<void> => {
  const ruleChunks = chunk(MAX_RULES_TO_UPDATE_IN_PARALLEL, rules);
  for (const ruleChunk of ruleChunks) {
    const rulePromises = createPromises(
      rulesClient,
      savedObjectsClient,
      ruleChunk,
      ruleExecutionLog
    );
    await Promise.all(rulePromises);
  }
};

/**
 * Creates promises of the rules and returns them.
 * @param rulesClient Alerting client
 * @param spaceId Current user spaceId
 * @param rules The rules to apply the update for
 * @returns Promise of what was updated.
 */
const createPromises = (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: PrebuiltRuleToInstall[],
  ruleExecutionLog: IRuleExecutionLogForRoutes
): Array<Promise<PartialRule<RuleParams> | null>> => {
  return rules.map(async (rule) => {
    const existingRule = await readRules({
      rulesClient,
      ruleId: rule.rule_id,
      id: undefined,
    });

    const migratedRule = await legacyMigrate({
      rulesClient,
      savedObjectsClient,
      rule: existingRule,
    });

    if (!migratedRule) {
      throw new PrepackagedRulesError(`Failed to find rule ${rule.rule_id}`, 500);
    }

    // If we're trying to change the type of a prepackaged rule, we need to delete the old one
    // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
    // and exception lists from the old rule
    if (rule.type !== migratedRule.params.type) {
      await deleteRules({
        ruleId: migratedRule.id,
        rulesClient,
      });

      return createRules({
        rulesClient,
        params: {
          ...rule,
          // Force the prepackaged rule to use the enabled state from the existing rule,
          // regardless of what the prepackaged rule says
          enabled: migratedRule.enabled,
          actions: migratedRule.actions.map(transformAlertToRuleAction),
        },
      });
    } else {
      return patchRules({
        rulesClient,
        existingRule: migratedRule,
        nextParams: {
          ...rule,
          // Force enabled to use the enabled state from the existing rule by passing in undefined to patchRules
          enabled: undefined,
          actions: undefined,
        },
      });
    }
  });
};
