/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkEditError, RulesClient } from '@kbn/alerting-plugin/server';
import pMap from 'p-map';

import {
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
} from '../../../../../../common/constants';

import type {
  BulkActionEditPayload,
  BulkActionEditPayloadRuleActions,
} from '../../../../../../common/detection_engine/rule_management';
import { BulkActionEditType } from '../../../../../../common/detection_engine/rule_management';

import type { MlAuthz } from '../../../../machine_learning/authz';

import { enrichFilterWithRuleTypeMapping } from '../search/enrich_filter_with_rule_type_mappings';
import { readRules } from '../crud/read_rules';
import type { RuleAlertType } from '../../../rule_schema';

import { ruleParamsModifier } from './rule_params_modifier';
import { splitBulkEditActions } from './split_bulk_edit_actions';
import { validateBulkEditRule } from './validations';
import { bulkEditActionToRulesClientOperation } from './action_to_rules_client_operation';

export interface BulkEditRulesArguments {
  rulesClient: RulesClient;
  actions: BulkActionEditPayload[];
  filter?: string;
  ids?: string[];
  mlAuthz: MlAuthz;
}

/**
 * calls rulesClient.bulkEdit
 * transforms bulk actions payload into rulesClient compatible operations
 * enriches query filter with rule types search queries
 * @param BulkEditRulesArguments
 * @returns edited rules and caught errors
 */
export const bulkEditRules = async ({
  rulesClient,
  ids,
  actions,
  filter,
  mlAuthz,
}: BulkEditRulesArguments) => {
  const { attributesActions, paramsActions } = splitBulkEditActions(actions);
  const operations = attributesActions.map(bulkEditActionToRulesClientOperation).flat();
  const result = await rulesClient.bulkEdit({
    ...(ids ? { ids } : { filter: enrichFilterWithRuleTypeMapping(filter) }),
    operations,
    paramsModifier: async (ruleParams: RuleAlertType['params']) => {
      await validateBulkEditRule({
        mlAuthz,
        ruleType: ruleParams.type,
        edit: actions,
        immutable: ruleParams.immutable,
      });
      return ruleParamsModifier(ruleParams, paramsActions);
    },
  });

  // rulesClient bulkEdit currently doesn't support bulk mute/unmute.
  // this is a workaround to mitigate this,
  // until https://github.com/elastic/kibana/issues/139084 is resolved
  // if rule actions has been applied, we go through each rule, unmute it if necessary and refetch it
  // calling unmute needed only if rule was muted and throttle value is not NOTIFICATION_THROTTLE_NO_ACTIONS
  const ruleActions = attributesActions.filter((rule): rule is BulkActionEditPayloadRuleActions =>
    [BulkActionEditType.set_rule_actions, BulkActionEditType.add_rule_actions].includes(rule.type)
  );

  // bulk edit actions are applied in historical order.
  // So, we need to find a rule action that will be applied the last, to be able to check if rule should be muted/unmuted
  const rulesAction = ruleActions.pop();

  if (rulesAction) {
    const unmuteErrors: BulkEditError[] = [];
    const rulesToUnmute = await pMap(
      result.rules,
      async (rule) => {
        try {
          if (rule.muteAll && rulesAction.value.throttle !== NOTIFICATION_THROTTLE_NO_ACTIONS) {
            await rulesClient.unmuteAll({ id: rule.id });
            return (await readRules({ rulesClient, id: rule.id, ruleId: undefined })) ?? rule;
          }

          return rule;
        } catch (err) {
          unmuteErrors.push({
            message: err.message,
            rule: {
              id: rule.id,
              name: rule.name,
            },
          });

          return null;
        }
      },
      { concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL }
    );

    return {
      ...result,
      rules: rulesToUnmute.filter((rule): rule is RuleAlertType => rule != null),
      errors: [...result.errors, ...unmuteErrors],
    };
  }

  return result;
};
