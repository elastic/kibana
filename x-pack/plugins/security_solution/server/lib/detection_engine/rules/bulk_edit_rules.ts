/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '@kbn/alerting-plugin/server';
import { BulkActionEditPayload } from '../../../../common/detection_engine/schemas/common';
import { enrichFilterWithAlertTypes } from './enrich_filter_with_alert_types';
import { MlAuthz } from '../../machine_learning/authz';
import { throwAuthzError } from '../../machine_learning/validation';

import { ruleParamsModifier } from './bulk_edit/rule_params_modifier';
import { splitBulkEditActions } from './bulk_edit/split_bulk_edit_actions';
import { bulkEditActionToRulesClientOperation } from './bulk_edit/bulk_edit_action_to_rules_client_operation';

import { RuleAlertType } from './types';

export interface BulkEditRulesArguments {
  rulesClient: RulesClient;
  ids?: string[];
  actions: BulkActionEditPayload[];
  filter?: string;
  isRuleRegistryEnabled: boolean;
  mlAuthz?: MlAuthz;
}

/**
 * calls rulesClient.bulkEdit
 * transforms bulk actions payload into rulesClient compatible operations
 * enriches query filter with rule types search queries
 * @param BulkEditRulesArguments
 * @returns edited rules and caught errors
 */
export const bulkEditRules = ({
  rulesClient,
  ids,
  actions,
  filter,
  isRuleRegistryEnabled,
  mlAuthz,
}: BulkEditRulesArguments) => {
  const { attributesActions, paramsActions } = splitBulkEditActions(actions);

  return rulesClient.bulkEdit({
    ...(ids ? { ids } : {}),
    operations: attributesActions.map(bulkEditActionToRulesClientOperation),
    paramsModifier: async (ruleParams: RuleAlertType['params']) => {
      if (mlAuthz) {
        throwAuthzError(await mlAuthz?.validateRuleType?.(ruleParams.type));
      }

      return ruleParamsModifier(ruleParams, paramsActions);
    },
    ...(filter ? { filter: enrichFilterWithAlertTypes(filter, isRuleRegistryEnabled) } : {}),
  });
};
