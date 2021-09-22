/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertAction } from '../../../../../alerting/common';
import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__getRuleActionsSavedObject } from './do_not_use_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__createRuleActionsSavedObject } from './do_not_use_create_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__updateRuleActionsSavedObject } from './do_not_use_update_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__RuleActions } from './do_not_use_types';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface __DO_NOT_USE__UpdateOrCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: AlertAction[] | undefined;
  throttle: string | null | undefined;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__updateOrCreateRuleActionsSavedObject = async ({
  savedObjectsClient,
  ruleAlertId,
  actions,
  throttle,
}: __DO_NOT_USE__UpdateOrCreateRuleActionsSavedObject): Promise<__DO_NOT_USE__RuleActions> => {
  const ruleActions = await __DO_NOT_USE__getRuleActionsSavedObject({
    ruleAlertId,
    savedObjectsClient,
  });

  if (ruleActions != null) {
    return __DO_NOT_USE__updateRuleActionsSavedObject({
      ruleAlertId,
      savedObjectsClient,
      actions,
      throttle,
      ruleActions,
    });
  } else {
    return __DO_NOT_USE__createRuleActionsSavedObject({
      ruleAlertId,
      savedObjectsClient,
      actions,
      throttle,
    });
  }
};
