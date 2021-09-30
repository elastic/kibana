/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from './legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyGetThrottleOptions } from './legacy_utils';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';
import { AlertAction } from '../../../../../alerting/common';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyUpdateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: AlertAction[] | undefined;
  throttle: string | null | undefined;
  ruleActions: LegacyRulesActionsSavedObject;
}

/**
 * NOTE: This should _only_ be seen to be used within the legacy route of "legacyCreateLegacyNotificationRoute" and not exposed and not
 * used anywhere else. If you see it being used anywhere else, that would be a bug.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyUpdateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions,
  throttle,
  ruleActions,
}: LegacyUpdateRuleActionsSavedObject): Promise<void> => {
  const referenceWithAlertId = [{ id: ruleAlertId, type: 'alert', name: 'alert_0' }];
  const actionReferences =
    actions != null
      ? actions.map((action, index) => ({
          id: action.id,
          type: 'action',
          name: `action_${index}`,
        }))
      : ruleActions.actions.map((action, index) => ({
          id: action.id,
          type: 'action',
          name: `action_${index}`,
        }));

  const references: SavedObjectReference[] = [...referenceWithAlertId, ...actionReferences];
  const throttleOptions = throttle
    ? legacyGetThrottleOptions(throttle)
    : {
        ruleThrottle: ruleActions.ruleThrottle,
        alertThrottle: ruleActions.alertThrottle,
      };

  const attributes: LegacyIRuleActionsAttributesSavedObjectAttributes = {
    actions:
      actions != null
        ? actions.map(({ group, params, actionTypeId }, index) => ({
            actionRef: `action_${index}`,
            group,
            params,
            action_type_id: actionTypeId,
          }))
        : // eslint-disable-next-line @typescript-eslint/naming-convention
          ruleActions.actions.map(({ group, params, action_type_id }, index) => ({
            actionRef: `action_${index}`,
            group,
            params,
            action_type_id,
          })),
    ...throttleOptions,
  };

  await savedObjectsClient.update<LegacyIRuleActionsAttributesSavedObjectAttributes>(
    legacyRuleActionsSavedObjectType,
    ruleActions.id,
    attributes,
    { references }
  );
};
