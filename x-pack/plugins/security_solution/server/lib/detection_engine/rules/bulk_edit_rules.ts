/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  BulkActionEditPayload,
  BulkActionEditPayloadActions,
} from '../../../../common/detection_engine/schemas/common';
import { enrichFilterWithRuleTypeMapping } from './enrich_filter_with_rule_type_mappings';
import type { MlAuthz } from '../../machine_learning/authz';

import { ruleParamsModifier } from './bulk_actions/rule_params_modifier';
import { splitBulkEditActions } from './bulk_actions/split_bulk_edit_actions';
import { validateBulkEditRule } from './bulk_actions/validations';
import { bulkEditActionToRulesClientOperation } from './bulk_actions/action_to_rules_client_operation';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../common/constants';
import { BulkActionEditType } from '../../../../common/detection_engine/schemas/common/schemas';
import { readRules } from './read_rules';

import type { RuleAlertType } from './types';

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

  const result = await rulesClient.bulkEdit({
    ...(ids ? { ids } : { filter: enrichFilterWithRuleTypeMapping(filter) }),
    operations: attributesActions.map(bulkEditActionToRulesClientOperation).flat(),
    paramsModifier: async (ruleParams: RuleAlertType['params']) => {
      await validateBulkEditRule({ mlAuthz, ruleType: ruleParams.type });
      return ruleParamsModifier(ruleParams, paramsActions);
    },
  });

  // rulesClient bulkEdit currently doesn't support bulk mute/unmute.
  // this is a workaround to mitigate this
  // if rule actions has been applied:
  // - we go through each rule
  // - mute/unmute if needed, refetch rule
  // calling mute for rule needed only when rule was unmuted before and throttle value is  NOTIFICATION_THROTTLE_NO_ACTIONS
  // calling unmute needed only if rule was muted and throttle value is not NOTIFICATION_THROTTLE_NO_ACTIONS
  // TODO: error handlers (?)
  const rulesAction = attributesActions.find(({ type }) =>
    [BulkActionEditType.set_actions, BulkActionEditType.add_actions].includes(type)
  ) as BulkActionEditPayloadActions;
  if (rulesAction) {
    const rules = await pMap(
      result.rules,
      async (rule) => {
        if (rule.muteAll && rulesAction.value.throttle !== NOTIFICATION_THROTTLE_NO_ACTIONS) {
          await rulesClient.unmuteAll({ id: rule.id });
          return (await readRules({ rulesClient, id: rule.id, ruleId: undefined })) ?? rule;
        } else if (
          !rule.muteAll &&
          rulesAction.value.throttle === NOTIFICATION_THROTTLE_NO_ACTIONS
        ) {
          await rulesClient.muteAll({ id: rule.id });
          return (await readRules({ rulesClient, id: rule.id, ruleId: undefined })) ?? rule;
        }

        return rule;
      },
      { concurrency: 50 }
    );

    return { ...result, rules };
  }

  return result;
};
