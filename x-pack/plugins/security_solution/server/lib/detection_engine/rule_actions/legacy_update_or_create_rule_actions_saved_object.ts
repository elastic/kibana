/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RuleAction } from '@kbn/alerting-plugin/common';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';

// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsSavedObject } from './legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyCreateRuleActionsSavedObject } from './legacy_create_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyUpdateRuleActionsSavedObject } from './legacy_update_rule_actions_saved_object';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyUpdateOrCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'];
  actions: RuleAction[] | undefined;
  throttle: string | null | undefined;
  logger: Logger;
}

/**
 * NOTE: This should _only_ be seen to be used within the legacy route of "legacyCreateLegacyNotificationRoute" and not exposed and not
 * used anywhere else. If you see it being used anywhere else, that would be a bug.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @see legacyCreateLegacyNotificationRoute
 */
export const legacyUpdateOrCreateRuleActionsSavedObject = async ({
  savedObjectsClient,
  ruleAlertId,
  actions,
  throttle,
  logger,
}: LegacyUpdateOrCreateRuleActionsSavedObject): Promise<void> => {
  const ruleActions = await legacyGetRuleActionsSavedObject({
    ruleAlertId,
    savedObjectsClient,
    logger,
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
