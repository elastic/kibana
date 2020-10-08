/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../alerts/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { getRuleActionsSavedObject } from './get_rule_actions_saved_object';
import { createRuleActionsSavedObject } from './create_rule_actions_saved_object';
import { updateRuleActionsSavedObject } from './update_rule_actions_saved_object';
import { RuleActions } from './types';

interface UpdateOrCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: RuleAlertAction[] | undefined;
  throttle: string | null | undefined;
}

export const updateOrCreateRuleActionsSavedObject = async ({
  savedObjectsClient,
  ruleAlertId,
  actions,
  throttle,
}: UpdateOrCreateRuleActionsSavedObject): Promise<RuleActions> => {
  const ruleActions = await getRuleActionsSavedObject({ ruleAlertId, savedObjectsClient });

  if (ruleActions != null) {
    return updateRuleActionsSavedObject({
      ruleAlertId,
      savedObjectsClient,
      actions,
      throttle,
      ruleActions,
    });
  } else {
    return createRuleActionsSavedObject({ ruleAlertId, savedObjectsClient, actions, throttle });
  }
};
