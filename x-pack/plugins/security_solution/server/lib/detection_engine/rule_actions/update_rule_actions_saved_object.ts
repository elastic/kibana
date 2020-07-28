/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../alerts/server';
import { ruleActionsSavedObjectType } from './saved_object_mappings';
import { RulesActionsSavedObject } from './get_rule_actions_saved_object';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { getThrottleOptions } from './utils';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';

interface DeleteRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: RuleAlertAction[] | undefined;
  throttle: string | null | undefined;
  ruleActions: RulesActionsSavedObject;
}

export const updateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions,
  throttle,
  ruleActions,
}: DeleteRuleActionsSavedObject): Promise<RulesActionsSavedObject> => {
  const throttleOptions = throttle
    ? getThrottleOptions(throttle)
    : {
        ruleThrottle: ruleActions.ruleThrottle,
        alertThrottle: ruleActions.alertThrottle,
      };

  const options = {
    actions: actions ?? ruleActions.actions,
    ...throttleOptions,
  };

  await savedObjectsClient.update<IRuleActionsAttributesSavedObjectAttributes>(
    ruleActionsSavedObjectType,
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
