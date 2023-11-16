/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { BulkActionEditPayload } from '../../../../../../common/api/detection_engine/rule_management';

import type { MlAuthz } from '../../../../machine_learning/authz';

import { enrichFilterWithRuleTypeMapping } from '../search/enrich_filter_with_rule_type_mappings';
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

  return result;
};
