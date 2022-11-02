/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { TopAlert } from '../pages/alerts';
import { ConfigSchema } from '../plugin';

// We are mapping the ruleTypeId from the feature flag with the ruleTypeId form the alert
// to know whether the feature flag is enabled or not.
export const isAlertDetailsEnabledPerApp = (
  alert?: TopAlert | null,
  config?: ConfigSchema | null
): boolean => {
  if (!alert || !config) return false;
  const ruleTypeIdFromFeatureFlag = Object.keys(config.unsafe.alertDetails);
  let ruleTypeId = alert.fields[ALERT_RULE_TYPE_ID].split('.')[0] as string;

  // Uptime rule type id is not following the same name convention as all the other rules, so dedicated treatment needed.
  if (alert.fields[ALERT_RULE_TYPE_ID] === 'xpack.uptime.alerts.monitorStatus')
    ruleTypeId = 'uptime';

  const appName = ruleTypeId as unknown as keyof ConfigSchema['unsafe']['alertDetails'];
  return (
    ruleTypeIdFromFeatureFlag.includes(ruleTypeId) && config?.unsafe?.alertDetails[appName].enabled
  );
};
