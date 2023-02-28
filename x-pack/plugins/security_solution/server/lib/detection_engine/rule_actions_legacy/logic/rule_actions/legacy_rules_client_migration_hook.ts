/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule, ResolvedSanitizedRule } from '@kbn/alerting-plugin/common';

import type { FindResult, MigrateRules } from '@kbn/alerting-plugin/server';
import { legacyGetBulkRuleActionsSavedObject } from './legacy_get_bulk_rule_actions_saved_object';
export interface ReadMigrationOptions {
  rules: SanitizedRule[];
}

export interface ReadMigrationContext {
  rules: SanitizedRule[];
}

export const readMigration: MigrateRules = async (
  { rules },
  { logger, unsecuredSavedObjectsClient }
) => {
  const ruleIds = rules.map((rule) => rule.id);

  const legacyActions = await legacyGetBulkRuleActionsSavedObject({
    alertIds: ruleIds,
    logger,
    savedObjectsClient: unsecuredSavedObjectsClient,
  });

  return rules.map((rule) => {
    return rule;
  });
};
