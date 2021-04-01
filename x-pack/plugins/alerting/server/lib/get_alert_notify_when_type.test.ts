/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertNotifyWhenType } from './get_alert_notify_when_type';

test(`should return 'notifyWhen' value if value is set and throttle is null`, () => {
  expect(getAlertNotifyWhenType('onActionGroupChange', null)).toEqual('onActionGroupChange');
});

test(`should return 'notifyWhen' value if value is set and throttle is defined`, () => {
  expect(getAlertNotifyWhenType('onActionGroupChange', '10m')).toEqual('onActionGroupChange');
});

test(`should return 'onThrottleInterval' value if 'notifyWhen' is null and throttle is defined`, () => {
  expect(getAlertNotifyWhenType(null, '10m')).toEqual('onThrottleInterval');
});

test(`should return 'onActiveAlert' value if 'notifyWhen' is null and throttle is null`, () => {
  expect(getAlertNotifyWhenType(null, null)).toEqual('onActiveAlert');
});
