/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleNotifyWhenType } from '@kbn/alerting-plugin/common';

import {
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../../common/constants';

import type { RuleAlertType } from '../../rule_schema';

/**
 * Given a throttle from a "security_solution" rule this will transform it into an "alerting" notifyWhen
 * on their saved object.
 * @params throttle The throttle from a "security_solution" rule
 * @returns The correct "NotifyWhen" for a Kibana alerting.
 */
export const transformToNotifyWhen = (
  throttle: string | null | undefined
): RuleNotifyWhenType | null => {
  if (throttle == null || throttle === NOTIFICATION_THROTTLE_NO_ACTIONS) {
    return null; // Although I return null, this does not change the value of the "notifyWhen" and it keeps the current value of "notifyWhen"
  } else if (throttle === NOTIFICATION_THROTTLE_RULE) {
    return 'onActiveAlert';
  } else {
    return 'onThrottleInterval';
  }
};

/**
 * Given a throttle from a "security_solution" rule this will transform it into an "alerting" "throttle"
 * on their saved object.
 * @params throttle The throttle from a "security_solution" rule
 * @returns The "alerting" throttle
 */
export const transformToAlertThrottle = (throttle: string | null | undefined): string | null => {
  if (
    throttle == null ||
    throttle === NOTIFICATION_THROTTLE_RULE ||
    throttle === NOTIFICATION_THROTTLE_NO_ACTIONS
  ) {
    return null;
  } else {
    return throttle;
  }
};

/**
 * Given a throttle from an "alerting" Saved Object (SO) this will transform it into a "security_solution"
 * throttle type. If given the "legacyRuleActions" but we detect that the rule for an unknown reason has actions
 * on it to which should not be typical but possible due to the split nature of the API's, this will prefer the
 * usage of the non-legacy version. Eventually the "legacyRuleActions" should be removed.
 * @param throttle The throttle from a  "alerting" Saved Object (SO)
 * @returns The "security_solution" throttle
 */
export const transformFromAlertThrottle = (rule: RuleAlertType): string => {
  if (rule.muteAll || rule.actions.length === 0) {
    return NOTIFICATION_THROTTLE_NO_ACTIONS;
  } else if (rule.notifyWhen == null) {
    return transformFromFirstActionThrottle(rule);
  } else if (rule.notifyWhen === 'onActiveAlert') {
    return NOTIFICATION_THROTTLE_RULE;
  }

  return rule.throttle ?? NOTIFICATION_THROTTLE_NO_ACTIONS;
};

function transformFromFirstActionThrottle(rule: RuleAlertType) {
  const frequency = rule.actions[0].frequency ?? null;
  if (!frequency || frequency.notifyWhen !== 'onThrottleInterval' || frequency.throttle == null)
    return NOTIFICATION_THROTTLE_RULE;
  return frequency.throttle;
}
