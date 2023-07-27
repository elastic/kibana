/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesTypeUsage, RuleMetric, FeatureTypeUsage } from '../types';
import { getNotificationsEnabledDisabled } from './get_notifications_enabled_disabled';

export interface UpdateTotalUsageOptions {
  detectionRuleMetric: RuleMetric;
  updatedUsage: RulesTypeUsage;
  totalType: 'custom_total' | 'elastic_total';
}

export const updateTotalUsage = ({
  detectionRuleMetric,
  updatedUsage,
  totalType,
}: UpdateTotalUsageOptions): FeatureTypeUsage => {
  const {
    legacyNotificationEnabled,
    legacyNotificationDisabled,
    notificationEnabled,
    notificationDisabled,
  } = getNotificationsEnabledDisabled(detectionRuleMetric);

  return {
    enabled: detectionRuleMetric.enabled
      ? updatedUsage[totalType].enabled + 1
      : updatedUsage[totalType].enabled,
    disabled: !detectionRuleMetric.enabled
      ? updatedUsage[totalType].disabled + 1
      : updatedUsage[totalType].disabled,
    alerts: updatedUsage[totalType].alerts + detectionRuleMetric.alert_count_daily,
    cases: updatedUsage[totalType].cases + detectionRuleMetric.cases_count_total,
    legacy_notifications_enabled: legacyNotificationEnabled
      ? updatedUsage[totalType].legacy_notifications_enabled + 1
      : updatedUsage[totalType].legacy_notifications_enabled,
    legacy_notifications_disabled: legacyNotificationDisabled
      ? updatedUsage[totalType].legacy_notifications_disabled + 1
      : updatedUsage[totalType].legacy_notifications_disabled,
    notifications_enabled: notificationEnabled
      ? updatedUsage[totalType].notifications_enabled + 1
      : updatedUsage[totalType].notifications_enabled,
    notifications_disabled: notificationDisabled
      ? updatedUsage[totalType].notifications_disabled + 1
      : updatedUsage[totalType].notifications_disabled,
  };
};
