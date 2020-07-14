/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { AlertInstance } from './alert_instance';

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers();
});
beforeEach(() => clock.reset());
afterAll(() => clock.restore());

describe('hasScheduledActions()', () => {
  test('defaults to false', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.hasScheduledActions()).toEqual(false);
  });

  test('returns true when scheduleActions is called', () => {
    const alertInstance = new AlertInstance();
    alertInstance.scheduleActions('default');
    expect(alertInstance.hasScheduledActions()).toEqual(true);
  });
});

describe('isThrottled', () => {
  test(`should throttle when group didn't change and throttle period is still active`, () => {
    const alertInstance = new AlertInstance({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(30000);
    alertInstance.scheduleActions('default');
    expect(alertInstance.isThrottled('1m')).toEqual(true);
  });

  test(`shouldn't throttle when group didn't change and throttle period expired`, () => {
    const alertInstance = new AlertInstance({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(30000);
    alertInstance.scheduleActions('default');
    expect(alertInstance.isThrottled('15s')).toEqual(false);
  });

  test(`shouldn't throttle when group changes`, () => {
    const alertInstance = new AlertInstance({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(5000);
    alertInstance.scheduleActions('other-group');
    expect(alertInstance.isThrottled('1m')).toEqual(false);
  });
});

describe('getScheduledActionOptions()', () => {
  test('defaults to undefined', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.getScheduledActionOptions()).toBeUndefined();
  });
});

describe('unscheduleActions()', () => {
  test('makes hasScheduledActions() return false', () => {
    const alertInstance = new AlertInstance();
    alertInstance.scheduleActions('default');
    expect(alertInstance.hasScheduledActions()).toEqual(true);
    alertInstance.unscheduleActions();
    expect(alertInstance.hasScheduledActions()).toEqual(false);
  });

  test('makes getScheduledActionOptions() return undefined', () => {
    const alertInstance = new AlertInstance();
    alertInstance.scheduleActions('default');
    expect(alertInstance.getScheduledActionOptions()).toEqual({
      actionGroup: 'default',
      context: {},
      state: {},
    });
    alertInstance.unscheduleActions();
    expect(alertInstance.getScheduledActionOptions()).toBeUndefined();
  });
});

describe('getState()', () => {
  test('returns state passed to constructor', () => {
    const state = { foo: true };
    const alertInstance = new AlertInstance({ state });
    expect(alertInstance.getState()).toEqual(state);
  });
});

describe('scheduleActions()', () => {
  test('makes hasScheduledActions() return true', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alertInstance.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alertInstance.hasScheduledActions()).toEqual(true);
  });

  test('makes isThrottled() return true when throttled', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alertInstance.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alertInstance.isThrottled('1m')).toEqual(true);
  });

  test('make isThrottled() return false when throttled expired', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(120000);
    alertInstance.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alertInstance.isThrottled('1m')).toEqual(false);
  });

  test('makes getScheduledActionOptions() return given options', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: {} });
    alertInstance.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alertInstance.getScheduledActionOptions()).toEqual({
      actionGroup: 'default',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot schdule for execution twice', () => {
    const alertInstance = new AlertInstance();
    alertInstance.scheduleActions('default', { field: true });
    expect(() =>
      alertInstance.scheduleActions('default', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });
});

describe('replaceState()', () => {
  test('replaces previous state', () => {
    const alertInstance = new AlertInstance({ state: { foo: true } });
    alertInstance.replaceState({ bar: true });
    expect(alertInstance.getState()).toEqual({ bar: true });
    alertInstance.replaceState({ baz: true });
    expect(alertInstance.getState()).toEqual({ baz: true });
  });
});

describe('updateLastScheduledActions()', () => {
  test('replaces previous lastScheduledActions', () => {
    const alertInstance = new AlertInstance({ meta: {} });
    alertInstance.updateLastScheduledActions('default');
    expect(alertInstance.toJSON()).toEqual({
      state: {},
      meta: {
        lastScheduledActions: {
          date: new Date().toISOString(),
          group: 'default',
        },
      },
    });
  });
});

describe('toJSON', () => {
  test('only serializes state and meta', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    expect(JSON.stringify(alertInstance)).toEqual(
      '{"state":{"foo":true},"meta":{"lastScheduledActions":{"date":"1970-01-01T00:00:00.000Z","group":"default"}}}'
    );
  });
});

describe('toRaw', () => {
  test('returns unserialised underlying state and meta', () => {
    const raw = {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    };
    const alertInstance = new AlertInstance(raw);
    expect(alertInstance.toRaw()).toEqual(raw);
  });
});
