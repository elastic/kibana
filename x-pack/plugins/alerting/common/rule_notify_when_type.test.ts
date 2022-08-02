/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNotifyWhenType } from './rule_notify_when_type';

test('validates valid notify when type', () => {
  expect(validateNotifyWhenType('onActionGroupChange')).toBeUndefined();
  expect(validateNotifyWhenType('onActiveAlert')).toBeUndefined();
  expect(validateNotifyWhenType('onThrottleInterval')).toBeUndefined();
});
test('returns error string if input is not valid notify when type', () => {
  expect(validateNotifyWhenType('randomString')).toEqual(
    `string is not a valid RuleNotifyWhenType: randomString`
  );
});
