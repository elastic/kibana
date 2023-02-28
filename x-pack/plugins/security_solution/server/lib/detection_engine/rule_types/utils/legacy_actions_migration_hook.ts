/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';

import type { MigrateRules } from '@kbn/alerting-plugin/server';
import { transformRuleToAlertAction } from '../../../../../common/detection_engine/transform_actions';
import { transformFromAlertThrottle, transformActions } from '../../rule_management';

// eslint-disable-next-line no-restricted-imports
import { legacyGetBulkRuleActionsSavedObject } from '../../rule_actions_legacy/logic/rule_actions/legacy_get_bulk_rule_actions_saved_object';
export interface ReadMigrationOptions {
  rules: SanitizedRule[];
}

export interface ReadMigrationContext {
  rules: SanitizedRule[];
}

export const legacyActionsMigrationHook: MigrateRules = async (
  { rules },
  { logger, unsecuredSavedObjectsClient }
) => {
  const ruleIds = rules.map((rule) => rule.id);

  const legacyActionsMap = await legacyGetBulkRuleActionsSavedObject({
    alertIds: ruleIds,
    logger,
    savedObjectsClient: unsecuredSavedObjectsClient,
  });

  return rules.map((rule) => {
    const legacyActions = legacyActionsMap[rule.id];
    return {
      ...rule,
      actions: transformActions(rule.actions, legacyActions).map(transformRuleToAlertAction),
      throttle: transformFromAlertThrottle(rule, legacyActions),
    };
  });
};
