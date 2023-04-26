/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleActionFrequency, RuleNotifyWhenType } from '@kbn/alerting-plugin/common';

import {
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../../common/constants';

import type { RuleAlertType } from '../../rule_schema';

export const transformToFrequency = (throttle: string | null | undefined): RuleActionFrequency => {
  return {
    summary: true,
    notifyWhen: transformToNotifyWhen(throttle) ?? 'onActiveAlert',
    throttle: transformToAlertThrottle(throttle),
  };
};

interface ActionWithFrequency {
  frequency?: RuleActionFrequency;
}

/**
 * The action level `frequency` attribute should always take precedence over the rule level `throttle`
 * Frequency's default value is `{ summary: true, throttle: null, notifyWhen: 'onActiveAlert' }`
 *
 * The transformation follows the next rules:
 * - Both rule level `throttle` and all actions have `frequency` are set: we will ignore rule level `throttle`
 * - Rule level `throttle` set and actions don't have `frequency` set: we will transform rule level `throttle` in action level `frequency`
 * - All actions have `frequency` set: do nothing
 * - Neither of them is set: we will set action level `frequency` to default value
 * - Rule level `throttle` and some of the actions have `frequency` set: we will transform rule level `throttle` and set it to actions without the frequency attribute
 * - Only some actions have `frequency` set and there is no rule level `throttle`: we will set default `frequency` to actions without frequency attribute
 */
export const transformToActionFrequency = <T extends ActionWithFrequency>(
  actions: T[],
  throttle: string | null | undefined
): T[] => {
  const defaultFrequency = transformToFrequency(throttle);
  return actions.map((action) => ({ ...action, frequency: action.frequency ?? defaultFrequency }));
};

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
 * throttle type.
 * @param throttle The throttle from an "alerting" Saved Object (SO)
 * @returns The "security_solution" throttle
 */
export const transformFromAlertThrottle = (rule: RuleAlertType): string | undefined => {
  if (rule.notifyWhen == null) {
    return transformFromFirstActionThrottle(rule);
  } else if (rule.notifyWhen === 'onActiveAlert') {
    return NOTIFICATION_THROTTLE_RULE;
  }

  return rule.throttle ?? undefined;
};

function transformFromFirstActionThrottle(rule: RuleAlertType) {
  const frequency = rule.actions[0]?.frequency ?? null;
  if (!frequency || frequency.notifyWhen !== 'onThrottleInterval' || frequency.throttle == null)
    return NOTIFICATION_THROTTLE_RULE;
  return frequency.throttle;
}
