/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { RulesClient, PartialRule } from '@kbn/alerting-plugin/server';
import { AddPrepackagedRulesSchema } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../common/constants';
import { patchRules } from './patch_rules';
import { readRules } from './read_rules';
import { RuleParams } from '../schemas/rule_schemas';
import { legacyMigrate } from './utils';
import { deleteRules } from './delete_rules';
import { PrepackagedRulesError } from '../routes/rules/add_prepackaged_rules_route';
import { IRuleExecutionLogForRoutes } from '../rule_execution_log';
import { createRules } from './create_rules';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';

/**
 * Updates the prepackaged rules given a set of rules and output index.
 * This implements a chunked approach to not saturate network connections and
 * avoid being a "noisy neighbor".
 * @param rulesClient Alerting client
 * @param spaceId Current user spaceId
 * @param rules The rules to apply the update for
 */
export const updatePrepackagedRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: AddPrepackagedRulesSchema[],
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
export const createPromises = (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: AddPrepackagedRulesSchema[],
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
        ruleExecutionLog,
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
        rule: migratedRule,
        params: {
          ...rule,
          // Force enabled to use the enabled state from the existing rule by passing in undefined to patchRules
          enabled: undefined,
          actions: undefined,
        },
      });
    }
  });
};
