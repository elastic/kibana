/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction, RuleNotifyWhenType } from '@kbn/alerting-plugin/common';

import {
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../../common/constants';

import type { FullResponseSchema } from '../../../../../common/detection_engine/schemas/request';
import { transformAlertToRuleAction } from '../../../../../common/detection_engine/transform_actions';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRuleActions } from '../../rule_actions_legacy';
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
 * @param legacyRuleActions Legacy "side car" rule actions that if it detects it being passed it in will transform using it.
 * @returns The "security_solution" throttle
 */
export const transformFromAlertThrottle = (
  rule: RuleAlertType,
  legacyRuleActions: LegacyRuleActions | null | undefined
): string => {
  if (legacyRuleActions == null || (rule.actions != null && rule.actions.length > 0)) {
    if (rule.muteAll || rule.actions.length === 0) {
      return NOTIFICATION_THROTTLE_NO_ACTIONS;
    } else if (
      rule.notifyWhen === 'onActiveAlert' ||
      (rule.throttle == null && rule.notifyWhen == null)
    ) {
      return NOTIFICATION_THROTTLE_RULE;
    } else if (rule.throttle == null) {
      return NOTIFICATION_THROTTLE_NO_ACTIONS;
    } else {
      return rule.throttle;
    }
  } else {
    return legacyRuleActions.ruleThrottle;
  }
};

/**
 * Given a set of actions from an "alerting" Saved Object (SO) this will transform it into a "security_solution" alert action.
 * If this detects any legacy rule actions it will transform it. If both are sent in which is not typical but possible due to
 * the split nature of the API's this will prefer the usage of the non-legacy version. Eventually the "legacyRuleActions" should
 * be removed.
 * @param alertAction The alert action form a "alerting" Saved Object (SO).
 * @param legacyRuleActions Legacy "side car" rule actions that if it detects it being passed it in will transform using it.
 * @returns The actions of the FullResponseSchema
 */
export const transformActions = (
  alertAction: RuleAction[] | undefined,
  legacyRuleActions: LegacyRuleActions | null | undefined
): FullResponseSchema['actions'] => {
  if (alertAction != null && alertAction.length !== 0) {
    return alertAction.map((action) => transformAlertToRuleAction(action));
  } else if (legacyRuleActions != null) {
    return legacyRuleActions.actions;
  } else {
    return [];
  }
};
