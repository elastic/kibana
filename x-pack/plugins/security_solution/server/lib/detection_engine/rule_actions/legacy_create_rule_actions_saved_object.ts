/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyGetThrottleOptions, legacyGetRuleActionsFromSavedObject } from './legacy_utils';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from './legacy_get_rule_actions_saved_object';
import { AlertAction } from '../../../../../alerting/common';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: AlertAction[] | undefined;
  throttle: string | null | undefined;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyCreateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions = [],
  throttle,
}: LegacyCreateRuleActionsSavedObject): Promise<LegacyRulesActionsSavedObject> => {
  const ruleActionsSavedObject =
    await savedObjectsClient.create<LegacyIRuleActionsAttributesSavedObjectAttributes>(
      legacyRuleActionsSavedObjectType,
      {
        ruleAlertId,
        actions: actions.map((action) => transformAlertToRuleAction(action)),
        ...legacyGetThrottleOptions(throttle),
      }
    );

  return legacyGetRuleActionsFromSavedObject(ruleActionsSavedObject);
};
