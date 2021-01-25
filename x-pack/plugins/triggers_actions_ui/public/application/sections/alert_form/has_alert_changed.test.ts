/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InitialAlert } from './alert_reducer';
import { hasAlertChanged } from './has_alert_changed';

function createAlert(overrides = {}): InitialAlert {
  return {
    params: {},
    consumer: 'test',
    alertTypeId: 'test',
    schedule: {
      interval: '1m',
    },
    actions: [],
    tags: [],
    notifyWhen: 'onActionGroupChange',
    ...overrides,
  };
}

test('should return false for same alert', () => {
  const a = createAlert();
  expect(hasAlertChanged(a, a, true)).toEqual(false);
});

test('should return true for different alert', () => {
  const a = createAlert();
  const b = createAlert({ alertTypeId: 'differentTest' });
  expect(hasAlertChanged(a, b, true)).toEqual(true);
});

test('should correctly compare name field', () => {
  // name field doesn't exist initially
  const a = createAlert();
  // set name to actual value
  const b = createAlert({ name: 'myAlert' });
  // set name to different value
  const c = createAlert({ name: 'anotherAlert' });
  // set name to various empty/null/undefined states
  const d = createAlert({ name: '' });
  const e = createAlert({ name: undefined });
  const f = createAlert({ name: null });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
  expect(hasAlertChanged(a, c, true)).toEqual(true);
  expect(hasAlertChanged(a, d, true)).toEqual(false);
  expect(hasAlertChanged(a, e, true)).toEqual(false);
  expect(hasAlertChanged(a, f, true)).toEqual(false);

  expect(hasAlertChanged(b, c, true)).toEqual(true);
  expect(hasAlertChanged(b, d, true)).toEqual(true);
  expect(hasAlertChanged(b, e, true)).toEqual(true);
  expect(hasAlertChanged(b, f, true)).toEqual(true);

  expect(hasAlertChanged(c, d, true)).toEqual(true);
  expect(hasAlertChanged(c, e, true)).toEqual(true);
  expect(hasAlertChanged(c, f, true)).toEqual(true);

  expect(hasAlertChanged(d, e, true)).toEqual(false);
  expect(hasAlertChanged(d, f, true)).toEqual(false);
});

test('should correctly compare alertTypeId field', () => {
  const a = createAlert();

  // set alertTypeId to different value
  const b = createAlert({ alertTypeId: 'myAlertId' });
  // set alertTypeId to various empty/null/undefined states
  const c = createAlert({ alertTypeId: '' });
  const d = createAlert({ alertTypeId: undefined });
  const e = createAlert({ alertTypeId: null });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
  expect(hasAlertChanged(a, c, true)).toEqual(true);
  expect(hasAlertChanged(a, d, true)).toEqual(true);
  expect(hasAlertChanged(a, e, true)).toEqual(true);

  expect(hasAlertChanged(b, c, true)).toEqual(true);
  expect(hasAlertChanged(b, d, true)).toEqual(true);
  expect(hasAlertChanged(b, e, true)).toEqual(true);

  expect(hasAlertChanged(c, d, true)).toEqual(false);
  expect(hasAlertChanged(c, e, true)).toEqual(false);
  expect(hasAlertChanged(d, e, true)).toEqual(false);
});

test('should correctly compare throttle field', () => {
  // throttle field doesn't exist initially
  const a = createAlert();
  // set throttle to actual value
  const b = createAlert({ throttle: '1m' });
  // set throttle to different value
  const c = createAlert({ throttle: '1h' });
  // set throttle to various empty/null/undefined states
  const d = createAlert({ throttle: '' });
  const e = createAlert({ throttle: undefined });
  const f = createAlert({ throttle: null });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
  expect(hasAlertChanged(a, c, true)).toEqual(true);
  expect(hasAlertChanged(a, d, true)).toEqual(false);
  expect(hasAlertChanged(a, e, true)).toEqual(false);
  expect(hasAlertChanged(a, f, true)).toEqual(false);

  expect(hasAlertChanged(b, c, true)).toEqual(true);
  expect(hasAlertChanged(b, d, true)).toEqual(true);
  expect(hasAlertChanged(b, e, true)).toEqual(true);
  expect(hasAlertChanged(b, f, true)).toEqual(true);

  expect(hasAlertChanged(c, d, true)).toEqual(true);
  expect(hasAlertChanged(c, e, true)).toEqual(true);
  expect(hasAlertChanged(c, f, true)).toEqual(true);

  expect(hasAlertChanged(d, e, true)).toEqual(false);
  expect(hasAlertChanged(d, f, true)).toEqual(false);
});

test('should correctly compare tags field', () => {
  const a = createAlert();
  const b = createAlert({ tags: ['first'] });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
});

test('should correctly compare schedule field', () => {
  const a = createAlert();
  const b = createAlert({ schedule: { interval: '3h' } });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
});

test('should correctly compare actions field', () => {
  const a = createAlert();
  const b = createAlert({
    actions: [{ actionTypeId: 'action', group: 'group', id: 'actionId', params: {} }],
  });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
});

test('should skip comparing params field if compareParams=false', () => {
  const a = createAlert();
  const b = createAlert({ params: { newParam: 'value' } });

  expect(hasAlertChanged(a, b, false)).toEqual(false);
});

test('should correctly compare params field if compareParams=true', () => {
  const a = createAlert();
  const b = createAlert({ params: { newParam: 'value' } });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
});

test('should correctly compare notifyWhen field', () => {
  const a = createAlert();
  const b = createAlert({ notifyWhen: 'onActiveAlert' });

  expect(hasAlertChanged(a, b, true)).toEqual(true);
});
