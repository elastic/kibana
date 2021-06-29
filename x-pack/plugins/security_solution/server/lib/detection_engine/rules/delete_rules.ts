/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteNotifications } from '../notifications/delete_notifications';
import { deleteRuleActionsSavedObject } from '../rule_actions/delete_rule_actions_saved_object';
import { DeleteRuleOptions } from './types';

export const deleteRules = async ({
  alertsClient,
  savedObjectsClient,
  ruleStatusClient,
  ruleStatuses,
  id,
}: DeleteRuleOptions) => {
  await alertsClient.delete({ id });
  await deleteNotifications({ alertsClient, ruleAlertId: id });
  await deleteRuleActionsSavedObject({ ruleAlertId: id, savedObjectsClient });
  ruleStatuses.saved_objects.forEach(async (obj) => ruleStatusClient.delete(obj.id));
};
