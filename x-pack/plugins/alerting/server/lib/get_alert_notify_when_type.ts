/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertNotifyWhenType } from '../types';

export function getAlertNotifyWhenType(
  notifyWhen: AlertNotifyWhenType | null,
  throttle: string | null
): AlertNotifyWhenType {
  // We allow notifyWhen to be null for backwards compatibility. If it is null, determine its
  // value based on whether the throttle is set to a value or null
  return notifyWhen ? notifyWhen! : throttle ? 'onThrottleInterval' : 'onActiveAlert';
}
