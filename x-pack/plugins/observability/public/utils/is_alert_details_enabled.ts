/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { TopAlert } from '../pages/alerts';
import { ConfigSchema } from '../plugin';

// We are mapping the ruleTypeId from the feature flag with the ruleTypeId from the alert
// to know whether the feature flag is enabled or not.
export const isAlertDetailsEnabledPerApp = (
  alert: TopAlert | null,
  config: ConfigSchema | null
): boolean => {
  if (!alert || !config) return false;

  const ruleTypeId = alert.fields[ALERT_RULE_TYPE_ID];

  const appNameFromAlertRuleType =
    ruleTypeId === 'xpack.uptime.alerts.monitorStatus' ||
    ruleTypeId === 'xpack.uptime.alerts.tlsCertificate'
      ? 'uptime'
      : (ruleTypeId.split('.')[0] as keyof ConfigSchema['unsafe']['alertDetails']);

  return config.unsafe?.alertDetails[appNameFromAlertRuleType]?.enabled;
};
