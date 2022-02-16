/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesTypeUsage, RuleMetric, FeatureTypeUsage } from '../types';
import { getNotificationsEnabledDisabled } from './get_notifications_enabled_disabled';

export interface UpdateQueryUsageOptions {
  ruleType: keyof RulesTypeUsage;
  usage: RulesTypeUsage;
  detectionRuleMetric: RuleMetric;
}

export const updateQueryUsage = ({
  ruleType,
  usage,
  detectionRuleMetric,
}: UpdateQueryUsageOptions): FeatureTypeUsage => {
  const {
    legacyNotificationEnabled,
    legacyNotificationDisabled,
    notificationEnabled,
    notificationDisabled,
  } = getNotificationsEnabledDisabled(detectionRuleMetric);
  return {
    enabled: detectionRuleMetric.enabled ? usage[ruleType].enabled + 1 : usage[ruleType].enabled,
    disabled: !detectionRuleMetric.enabled
      ? usage[ruleType].disabled + 1
      : usage[ruleType].disabled,
    alerts: usage[ruleType].alerts + detectionRuleMetric.alert_count_daily,
    cases: usage[ruleType].cases + detectionRuleMetric.cases_count_total,
    legacy_notifications_enabled: legacyNotificationEnabled
      ? usage[ruleType].legacy_notifications_enabled + 1
      : usage[ruleType].legacy_notifications_enabled,
    legacy_notifications_disabled: legacyNotificationDisabled
      ? usage[ruleType].legacy_notifications_disabled + 1
      : usage[ruleType].legacy_notifications_disabled,
    notifications_enabled: notificationEnabled
      ? usage[ruleType].notifications_enabled + 1
      : usage[ruleType].notifications_enabled,
    notifications_disabled: notificationDisabled
      ? usage[ruleType].notifications_disabled + 1
      : usage[ruleType].notifications_disabled,
  };
};
