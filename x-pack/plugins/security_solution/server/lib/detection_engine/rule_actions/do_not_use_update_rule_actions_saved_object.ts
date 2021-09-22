/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__ruleActionsSavedObjectType } from './do_not_use_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__RulesActionsSavedObject } from './do_not_use_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__getThrottleOptions } from './do_not_use_utils';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes } from './do_not_use_types';
import { AlertAction } from '../../../../../alerting/common';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface __DO_NOT_USE__UpdateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: AlertAction[] | undefined;
  throttle: string | null | undefined;
  ruleActions: __DO_NOT_USE__RulesActionsSavedObject;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__updateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions,
  throttle,
  ruleActions,
}: __DO_NOT_USE__UpdateRuleActionsSavedObject): Promise<__DO_NOT_USE__RulesActionsSavedObject> => {
  const throttleOptions = throttle
    ? __DO_NOT_USE__getThrottleOptions(throttle)
    : {
        ruleThrottle: ruleActions.ruleThrottle,
        alertThrottle: ruleActions.alertThrottle,
      };

  const options = {
    actions:
      actions != null
        ? actions.map((action) => transformAlertToRuleAction(action))
        : ruleActions.actions,
    ...throttleOptions,
  };

  await savedObjectsClient.update<__DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes>(
    __DO_NOT_USE__ruleActionsSavedObjectType,
    ruleActions.id,
    {
      ruleAlertId,
      ...options,
    }
  );

  return {
    id: ruleActions.id,
    ...options,
  };
};
