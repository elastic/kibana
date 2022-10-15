/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingUsage } from '../types';

export function groupRulesByNotifyWhen(
  rulesByNotifyWhen: Record<string, number>
): AlertingUsage['count_rules_by_notify_when'] {
  return {
    on_action_group_change: rulesByNotifyWhen.onActionGroupChange ?? 0,
    on_active_alert: rulesByNotifyWhen.onActiveAlert ?? 0,
    on_throttle_interval: rulesByNotifyWhen.onThrottleInterval ?? 0,
  };
}
