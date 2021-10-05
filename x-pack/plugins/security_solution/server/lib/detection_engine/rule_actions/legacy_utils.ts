/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUpdateResponse } from 'kibana/server';

// eslint-disable-next-line no-restricted-imports
import {
  LegacyIRuleActionsAttributesSavedObjectAttributes,
  LegacyRuleAlertAction,
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
  savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes>
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
