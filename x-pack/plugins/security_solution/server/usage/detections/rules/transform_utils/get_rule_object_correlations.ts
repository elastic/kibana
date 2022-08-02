/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import type { RuleMetric } from '../types';
import type { RuleSearchResult } from '../../../types';

export interface RuleObjectCorrelationsOptions {
  ruleResults: Array<SavedObjectsFindResult<RuleSearchResult>>;
  legacyNotificationRuleIds: Map<
    string,
    {
      enabled: boolean;
    }
  >;
  casesRuleIds: Map<string, number>;
  alertsCounts: Map<string, number>;
}

export const getRuleObjectCorrelations = ({
  ruleResults,
  legacyNotificationRuleIds,
  casesRuleIds,
  alertsCounts,
}: RuleObjectCorrelationsOptions): RuleMetric[] => {
  return ruleResults.map((result) => {
    const ruleId = result.id;
    const { attributes } = result;

    // Even if the legacy notification is set to "no_actions" we still count the rule as having a legacy notification that is not migrated yet.
    const hasLegacyNotification = legacyNotificationRuleIds.get(ruleId) != null;

    // We only count a rule as having a notification and being "enabled" if it is _not_ set to "no_actions"/"muteAll" and it has at least one action within its array.
    const hasNotification =
      !hasLegacyNotification &&
      attributes.actions != null &&
      attributes.actions.length > 0 &&
      attributes.muteAll !== true;

    return {
      rule_name: attributes.name,
      rule_id: attributes.params.ruleId,
      rule_type: attributes.params.type,
      rule_version: attributes.params.version,
      enabled: attributes.enabled,
      // if rule immutable, it's Elastic/prebuilt
      elastic_rule: attributes.params.immutable,
      created_on: attributes.createdAt,
      updated_on: attributes.updatedAt,
      alert_count_daily: alertsCounts.get(ruleId) || 0,
      cases_count_total: casesRuleIds.get(ruleId) || 0,
      has_legacy_notification: hasLegacyNotification,
      has_notification: hasNotification,
    };
  });
};
