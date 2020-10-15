/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../alerts/server';
import { ruleActionsSavedObjectType } from './saved_object_mappings';
import { getRuleActionsSavedObject } from './get_rule_actions_saved_object';

interface DeleteRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
}

export const deleteRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
}: DeleteRuleActionsSavedObject): Promise<{} | null> => {
  const ruleActions = await getRuleActionsSavedObject({ ruleAlertId, savedObjectsClient });
  if (ruleActions != null) {
    return savedObjectsClient.delete(ruleActionsSavedObjectType, ruleActions.id);
  } else {
    return null;
  }
};
