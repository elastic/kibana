/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleNotifyWhenType } from '../types';

export function getRuleNotifyWhenType(
  notifyWhen: RuleNotifyWhenType | null,
  throttle: string | null
): RuleNotifyWhenType {
  // We allow notifyWhen to be null for backwards compatibility. If it is null, determine its
  // value based on whether the throttle is set to a value or null
  return notifyWhen ? notifyWhen! : throttle ? 'onThrottleInterval' : 'onActiveAlert';
}
