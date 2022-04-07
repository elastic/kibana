/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { RuleExecutorServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import {
  legacyGetActionReference,
  legacyGetRuleReference,
  legacyGetThrottleOptions,
  legacyTransformActionToReference,
} from './legacy_utils';
import { RuleAction } from '../../../../../alerting/common';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'];
  actions: RuleAction[] | undefined;
  throttle: string | null | undefined;
}

/**
 * NOTE: This should _only_ be seen to be used within the legacy route of "legacyCreateLegacyNotificationRoute" and not exposed and not
 * used anywhere else. If you see it being used anywhere else, that would be a bug.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @see legacyCreateLegacyNotificationRoute
 */
export const legacyCreateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions = [],
  throttle,
}: LegacyCreateRuleActionsSavedObject): Promise<void> => {
  const referenceWithAlertId: SavedObjectReference[] = [legacyGetRuleReference(ruleAlertId)];
  const actionReferences: SavedObjectReference[] = actions.map((action, index) =>
    legacyGetActionReference(action.id, index)
  );
  const references: SavedObjectReference[] = [...referenceWithAlertId, ...actionReferences];
  await savedObjectsClient.create<LegacyIRuleActionsAttributesSavedObjectAttributes>(
    legacyRuleActionsSavedObjectType,
    {
      actions: actions.map((alertAction, index) =>
        legacyTransformActionToReference(alertAction, index)
      ),
      ...legacyGetThrottleOptions(throttle),
    },
    { references }
  );
};
