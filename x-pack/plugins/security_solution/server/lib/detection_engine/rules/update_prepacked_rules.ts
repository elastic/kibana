/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { RulesClient, PartialRule } from '@kbn/alerting-plugin/server';
import { AddPrepackagedRulesSchema } from '../../../../common/detection_engine/schemas/request/rule_schemas';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../common/constants';
import { patchRules } from './patch_rules';
import { readRules } from './read_rules';
import { InternalRuleCreate, RuleParams } from '../schemas/rule_schemas';
import { legacyMigrate } from './utils';
import { deleteRules } from './delete_rules';
import { PrepackagedRulesError } from '../routes/rules/add_prepackaged_rules_route';
import { IRuleExecutionLogForRoutes } from '../rule_execution_log';
import { AppClient } from '../../../types';
import { convertCreateAPIToInternalSchema } from '../schemas/rule_converters';

/**
 * Updates the prepackaged rules given a set of rules and output index.
 * This implements a chunked approach to not saturate network connections and
 * avoid being a "noisy neighbor".
 * @param rulesClient Alerting client
 * @param spaceId Current user spaceId
 * @param rules The rules to apply the update for
 * @param outputIndex The output index to apply the update to.
 */
export const updatePrepackagedRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: AddPrepackagedRulesSchema[],
  siemClient: AppClient,
  ruleExecutionLog: IRuleExecutionLogForRoutes
): Promise<void> => {
  const ruleChunks = chunk(MAX_RULES_TO_UPDATE_IN_PARALLEL, rules);
  for (const ruleChunk of ruleChunks) {
    const rulePromises = createPromises(
      rulesClient,
      savedObjectsClient,
      ruleChunk,
      siemClient,
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
 * @param outputIndex The output index to apply the update to.
 * @returns Promise of what was updated.
 */
export const createPromises = (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: AddPrepackagedRulesSchema[],
  siemClient: AppClient,
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

      const internalRuleCreate: InternalRuleCreate = {
        ...convertCreateAPIToInternalSchema(rule, siemClient, true),
        // Force the prepackaged rule to use the enabled state from the existing rule,
        // regardless of what the prepackaged rule says
        enabled: migratedRule.enabled,
      };

      return rulesClient.create({
        data: internalRuleCreate,
      });
    } else {
      return patchRules({
        rulesClient,
        rule: migratedRule,
        params: {
          ...rule,
          // Again, force enabled to use the enabled state from the existing rule
          enabled: migratedRule.enabled,
        },
      });
    }
  });
};
