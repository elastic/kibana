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
import { __DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes } from './do_not_use_types';
// eslint-disable-next-line no-restricted-imports
import {
  __DO_NOT_USE__getThrottleOptions,
  __DO_NOT_USE__getRuleActionsFromSavedObject,
} from './do_not_use_utils';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__RulesActionsSavedObject } from './do_not_use_get_rule_actions_saved_object';
import { AlertAction } from '../../../../../alerting/common';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface __DO_NOT_USE__CreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: AlertAction[] | undefined;
  throttle: string | null | undefined;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__createRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions = [],
  throttle,
}: __DO_NOT_USE__CreateRuleActionsSavedObject): Promise<__DO_NOT_USE__RulesActionsSavedObject> => {
  const ruleActionsSavedObject =
    await savedObjectsClient.create<__DO_NOT_USE__IRuleActionsAttributesSavedObjectAttributes>(
      __DO_NOT_USE__ruleActionsSavedObjectType,
      {
        ruleAlertId,
        actions: actions.map((action) => transformAlertToRuleAction(action)),
        ...__DO_NOT_USE__getThrottleOptions(throttle),
      }
    );

  return __DO_NOT_USE__getRuleActionsFromSavedObject(ruleActionsSavedObject);
};
