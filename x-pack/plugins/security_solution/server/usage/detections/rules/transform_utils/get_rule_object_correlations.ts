/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { RuleSearchResult } from '../../../types';
import type { RuleMetric } from '../types';
import { isElasticRule } from '../../../queries/utils/is_elastic_rule';

export interface RuleObjectCorrelationsOptions {
  ruleResults: Array<SearchHit<RuleSearchResult>>;
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
  return ruleResults.map((hit) => {
    const ruleId = hit._id.split(':')[1];
    const isElastic = isElasticRule(hit._source?.alert.tags);

    // Even if the legacy notification is set to "no_actions" we still count the rule as having a legacy notification that is not migrated yet.
    const hasLegacyNotification = legacyNotificationRuleIds.get(ruleId) != null;

    // We only count a rule as having a notification and being "enabled" if it is _not_ set to "no_actions"/"muteAll" and it has at least one action within its array.
    const hasNotification =
      !hasLegacyNotification &&
      hit._source?.alert.actions != null &&
      hit._source?.alert.actions.length > 0 &&
      hit._source?.alert.muteAll !== true;

    return {
      rule_name: String(hit._source?.alert.name),
      rule_id: String(hit._source?.alert.params.ruleId),
      rule_type: String(hit._source?.alert.params.type),
      rule_version: Number(hit._source?.alert.params.version),
      enabled: Boolean(hit._source?.alert.enabled),
      elastic_rule: isElastic,
      created_on: String(hit._source?.alert.createdAt),
      updated_on: String(hit._source?.alert.updatedAt),
      alert_count_daily: alertsCounts.get(ruleId) || 0,
      cases_count_total: casesRuleIds.get(ruleId) || 0,
      has_legacy_notification: hasLegacyNotification,
      has_notification: hasNotification,
    };
  });
};
