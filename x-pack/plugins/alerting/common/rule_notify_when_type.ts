/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const RuleNotifyWhenTypeValues = [
  'onActionGroupChange',
  'onActiveAlert',
  'onThrottleInterval',
] as const;
export type RuleNotifyWhenType = typeof RuleNotifyWhenTypeValues[number];

export function validateNotifyWhenType(notifyWhen: string) {
  if (RuleNotifyWhenTypeValues.includes(notifyWhen as RuleNotifyWhenType)) {
    return;
  }
  return `string is not a valid RuleNotifyWhenType: ${notifyWhen}`;
}
