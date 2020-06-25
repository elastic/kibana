/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { AlertsClient, AlertServices } from '../../../../../alerts/server';
import { updateOrCreateRuleActionsSavedObject } from '../rule_actions/update_or_create_rule_actions_saved_object';
import { updateNotifications } from '../notifications/update_notifications';
import { RuleActions } from '../rule_actions/types';

interface UpdateRulesNotifications {
  alertsClient: AlertsClient;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  ruleAlertId: string;
  actions: RuleAlertAction[] | undefined;
  throttle: string | null | undefined;
  enabled: boolean;
  name: string;
}

export const updateRulesNotifications = async ({
  alertsClient,
  savedObjectsClient,
  ruleAlertId,
  actions,
  enabled,
  name,
  throttle,
}: UpdateRulesNotifications): Promise<RuleActions> => {
  const ruleActions = await updateOrCreateRuleActionsSavedObject({
    savedObjectsClient,
    ruleAlertId,
    actions,
    throttle,
  });

  await updateNotifications({
    alertsClient,
    ruleAlertId,
    enabled,
    name,
    actions: ruleActions.actions,
    interval: ruleActions.alertThrottle,
  });

  return ruleActions;
};
