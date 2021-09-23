/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertAction } from '../../../../../alerting/common';
import { AlertServices } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsSavedObject } from './legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyCreateRuleActionsSavedObject } from './legacy_create_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyUpdateRuleActionsSavedObject } from './legacy_update_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { LegacyRuleActions } from './legacy_types';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
interface LegacyUpdateOrCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: AlertAction[] | undefined;
  throttle: string | null | undefined;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const legacyUpdateOrCreateRuleActionsSavedObject = async ({
  savedObjectsClient,
  ruleAlertId,
  actions,
  throttle,
}: LegacyUpdateOrCreateRuleActionsSavedObject): Promise<LegacyRuleActions> => {
  const ruleActions = await legacyGetRuleActionsSavedObject({
    ruleAlertId,
    savedObjectsClient,
  });

  if (ruleActions != null) {
    return legacyUpdateRuleActionsSavedObject({
      ruleAlertId,
      savedObjectsClient,
      actions,
      throttle,
      ruleActions,
    });
  } else {
    return legacyCreateRuleActionsSavedObject({
      ruleAlertId,
      savedObjectsClient,
      actions,
      throttle,
    });
  }
};
