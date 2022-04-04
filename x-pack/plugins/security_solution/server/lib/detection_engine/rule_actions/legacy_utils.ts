/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUpdateResponse } from 'kibana/server';
import { Logger } from 'src/core/server';

import { RuleAction } from '../../../../../alerting/common';

// eslint-disable-next-line no-restricted-imports
import {
  LegacyIRuleActionsAttributesSavedObjectAttributes,
  LegacyRuleAlertAction,
  LegacyRuleAlertSavedObjectAction,
} from './legacy_types';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetThrottleOptions = (
  throttle: string | undefined | null = 'no_actions'
): {
  ruleThrottle: string;
  alertThrottle: string | null;
} => ({
  ruleThrottle: throttle ?? 'no_actions',
  alertThrottle: ['no_actions', 'rule'].includes(throttle ?? 'no_actions') ? null : throttle,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetRuleActionsFromSavedObject = (
  savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes>,
  logger: Logger
): {
  id: string;
  actions: LegacyRuleAlertAction[];
  alertThrottle: string | null;
  ruleThrottle: string;
} => {
  const existingActions = savedObject.attributes.actions ?? [];
  // We have to serialize the action from the saved object references
  const actionsWithIdReplacedFromReference = existingActions.flatMap<LegacyRuleAlertAction>(
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ({ group, params, action_type_id, actionRef }) => {
      const found = savedObject.references?.find(
        (reference) => actionRef === reference.name && reference.type === 'action'
      );
      if (found) {
        return [
          {
            id: found.id,
            group,
            params,
            action_type_id,
          },
        ];
      } else {
        // We cannot find it so we return no actions. This line should not be reached.
        logger.error(
          [
            'Security Solution notification (Legacy) Expected to find an action within the action reference of:',
            `${actionRef} inside of the references of ${savedObject.references} but did not. Skipping this action.`,
          ].join('')
        );
        return [];
      }
    }
  );
  return {
    id: savedObject.id,
    actions: actionsWithIdReplacedFromReference,
    alertThrottle: savedObject.attributes.alertThrottle || null,
    ruleThrottle:
      savedObject.attributes.ruleThrottle == null || actionsWithIdReplacedFromReference.length === 0
        ? 'no_actions'
        : savedObject.attributes.ruleThrottle,
  };
};

/**
 * Given an id this returns a legacy rule reference.
 * @param id The id of the alert
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetRuleReference = (id: string) => ({
  id,
  type: 'alert',
  name: 'alert_0',
});

/**
 * Given an id this returns a legacy action reference.
 * @param id The id of the action
 * @param index The index of the action
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetActionReference = (id: string, index: number) => ({
  id,
  type: 'action',
  name: `action_${index}`,
});

/**
 * Given an alertAction this returns a transformed legacy action as a reference.
 * @param alertAction The alertAction
 * @param index The index of the action
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyTransformActionToReference = (
  alertAction: RuleAction,
  index: number
): LegacyRuleAlertSavedObjectAction => ({
  actionRef: `action_${index}`,
  group: alertAction.group,
  params: alertAction.params,
  action_type_id: alertAction.actionTypeId,
});

/**
 * Given an alertAction this returns a transformed legacy action as a reference.
 * @param alertAction The alertAction
 * @param index The index of the action
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyTransformLegacyRuleAlertActionToReference = (
  alertAction: LegacyRuleAlertAction,
  index: number
): LegacyRuleAlertSavedObjectAction => ({
  actionRef: `action_${index}`,
  group: alertAction.group,
  params: alertAction.params,
  action_type_id: alertAction.action_type_id,
});
