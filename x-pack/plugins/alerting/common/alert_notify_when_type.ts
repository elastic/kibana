/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const AlertNotifyWhenTypeValues = [
  'onActionGroupChange',
  'onActiveAlert',
  'onThrottleInterval',
] as const;
export type AlertNotifyWhenType = typeof AlertNotifyWhenTypeValues[number];

export function validateNotifyWhenType(notifyWhen: string) {
  if (AlertNotifyWhenTypeValues.includes(notifyWhen as AlertNotifyWhenType)) {
    return;
  }
  return `string is not a valid AlertNotifyWhenType: ${notifyWhen}`;
}
