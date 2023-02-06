/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Alert } from './alert';
import { AlertInstanceState, AlertInstanceContext, DefaultActionGroupId } from '../../common';

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers();
});
beforeEach(() => clock.reset());
afterAll(() => clock.restore());

describe('getId()', () => {
  test('correctly sets id in constructor', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    expect(alert.getId()).toEqual('1');
  });
});

describe('hasScheduledActions()', () => {
  test('defaults to false', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    expect(alert.hasScheduledActions()).toEqual(false);
  });

  test('returns true when scheduleActions is called', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActions('default');
    expect(alert.hasScheduledActions()).toEqual(true);
  });
});

describe('isThrottled', () => {
  test(`should throttle when group didn't change and throttle period is still active`, () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(30000);
    alert.scheduleActions('default');
    expect(alert.isThrottled({ throttle: '1m' })).toEqual(true);
  });

  test(`shouldn't throttle when group didn't change and throttle period expired`, () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(30000);
    alert.scheduleActions('default');
    expect(alert.isThrottled({ throttle: '15s' })).toEqual(false);
  });

  test(`shouldn't throttle when group changes`, () => {
    const alert = new Alert<never, never, 'default' | 'other-group'>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(5000);
    alert.scheduleActions('other-group');
    expect(alert.isThrottled({ throttle: '1m' })).toEqual(false);
  });

  test(`throttle a specific action`, () => {
    const alert = new Alert<never, never, 'default' | 'other-group'>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          actions: {
            'slack:1h': { date: new Date() },
          },
        },
      },
    });
    clock.tick(5000);
    alert.scheduleActions('other-group');
    expect(alert.isThrottled({ throttle: '1m', actionHash: 'slack:1h' })).toEqual(false);
  });

  test(`shouldn't throttle a specific action when group didn't change and throttle period expired`, () => {
    const alert = new Alert<never, never, 'default' | 'other-group'>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date('2020-01-01'),
          group: 'default',
          actions: {
            'slack:1h': { date: new Date() },
          },
        },
      },
    });
    clock.tick(30000);
    alert.scheduleActions('default');
    expect(alert.isThrottled({ throttle: '15s', actionHash: 'slack:1h' })).toEqual(false);
  });

  test(`shouldn't throttle a specific action when group changes`, () => {
    const alert = new Alert<never, never, 'default' | 'other-group'>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          actions: {
            'slack:1h': { date: new Date() },
          },
        },
      },
    });
    clock.tick(5000);
    alert.scheduleActions('other-group');
    expect(alert.isThrottled({ throttle: '1m', actionHash: 'slack:1h' })).toEqual(false);
  });
});

describe('scheduledActionGroupHasChanged()', () => {
  test('should be false if no last scheduled and nothing scheduled', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    expect(alert.scheduledActionGroupHasChanged()).toEqual(false);
  });

  test('should be false if group does not change', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.scheduleActions('default');
    expect(alert.scheduledActionGroupHasChanged()).toEqual(false);
  });

  test('should be true if no last scheduled and has scheduled action', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActions('default');
    expect(alert.scheduledActionGroupHasChanged()).toEqual(true);
  });

  test('should be true if group does change', () => {
    const alert = new Alert<never, never, 'default' | 'penguin'>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.scheduleActions('penguin');
    expect(alert.scheduledActionGroupHasChanged()).toEqual(true);
  });
});

describe('getScheduledActionOptions()', () => {
  test('defaults to undefined', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    expect(alert.getScheduledActionOptions()).toBeUndefined();
  });
});

describe('unscheduleActions()', () => {
  test('makes hasScheduledActions() return false', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActions('default');
    expect(alert.hasScheduledActions()).toEqual(true);
    alert.unscheduleActions();
    expect(alert.hasScheduledActions()).toEqual(false);
  });

  test('makes getScheduledActionOptions() return undefined', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActions('default');
    expect(alert.getScheduledActionOptions()).toEqual({
      actionGroup: 'default',
      context: {},
      state: {},
    });
    alert.unscheduleActions();
    expect(alert.getScheduledActionOptions()).toBeUndefined();
  });
});

describe('getState()', () => {
  test('returns state passed to constructor', () => {
    const state = { foo: true };
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state,
    });
    expect(alert.getState()).toEqual(state);
  });
});

describe('scheduleActions()', () => {
  test('makes hasScheduledActions() return true', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alert.hasScheduledActions()).toEqual(true);
  });

  test('makes isThrottled() return true when throttled', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alert.isThrottled({ throttle: '1m' })).toEqual(true);
  });

  test('make isThrottled() return false when throttled expired', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(120000);
    alert.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alert.isThrottled({ throttle: '1m' })).toEqual(false);
  });

  test('makes getScheduledActionOptions() return given options', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {},
    });
    alert.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alert.getScheduledActionOptions()).toEqual({
      actionGroup: 'default',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot schdule for execution twice', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActions('default', { field: true });
    expect(() =>
      alert.scheduleActions('default', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });
});

describe('replaceState()', () => {
  test('replaces previous state', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
    });
    alert.replaceState({ bar: true });
    expect(alert.getState()).toEqual({ bar: true });
    alert.replaceState({ baz: true });
    expect(alert.getState()).toEqual({ baz: true });
  });
});

describe('updateLastScheduledActions()', () => {
  test('replaces previous lastScheduledActions', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {},
    });
    alert.updateLastScheduledActions('default');
    expect(alert.toJSON()).toEqual({
      state: {},
      meta: {
        lastScheduledActions: {
          date: new Date().toISOString(),
          group: 'default',
        },
        flappingHistory: [],
      },
    });
  });

  test('replaces previous lastScheduledActions with a scheduled action', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {},
    });
    alert.updateLastScheduledActions('default', 'actionId1');
    expect(alert.toJSON()).toEqual({
      state: {},
      meta: {
        flappingHistory: [],
        lastScheduledActions: {
          date: new Date().toISOString(),
          group: 'default',
          actions: {
            actionId1: { date: new Date().toISOString() },
          },
        },
      },
    });
  });
});

describe('getContext()', () => {
  test('returns empty object when context has not been set', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    expect(alert.getContext()).toStrictEqual({});
  });

  test('returns context when context has not been set', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.setContext({ field: true });
    expect(alert.getContext()).toStrictEqual({ field: true });
  });
});

describe('hasContext()', () => {
  test('returns true when context has been set via scheduleActions()', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.scheduleActions('default', { field: true });
    expect(alert.hasContext()).toEqual(true);
  });

  test('returns true when context has been set via setContext()', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.setContext({ field: true });
    expect(alert.hasContext()).toEqual(true);
  });

  test('returns false when context has not been set', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    expect(alert.hasContext()).toEqual(false);
  });
});

describe('toJSON', () => {
  test('only serializes state and meta', () => {
    const alertInstance = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
      '1',
      {
        state: { foo: true },
        meta: {
          lastScheduledActions: {
            date: new Date(),
            group: 'default',
          },
          flappingHistory: [false, true],
          flapping: false,
          pendingRecoveredCount: 2,
        },
      }
    );
    expect(JSON.stringify(alertInstance)).toEqual(
      '{"state":{"foo":true},"meta":{"lastScheduledActions":{"date":"1970-01-01T00:00:00.000Z","group":"default"},"flappingHistory":[false,true],"flapping":false,"pendingRecoveredCount":2}}'
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
        flappingHistory: [false, true, true],
        pendingRecoveredCount: 2,
      },
    };
    const alertInstance = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
      '1',
      raw
    );
    expect(alertInstance.toRaw()).toEqual(raw);
  });

  test('returns unserialised underlying partial meta if recovered is true', () => {
    const raw = {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
        flappingHistory: [false, true, true],
        flapping: false,
      },
    };
    const alertInstance = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
      '1',
      raw
    );
    expect(alertInstance.toRaw(true)).toEqual({
      meta: {
        flappingHistory: [false, true, true],
        flapping: false,
      },
    });
  });
});

describe('setFlappingHistory', () => {
  test('sets flappingHistory', () => {
    const alertInstance = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
      '1',
      {
        meta: { flappingHistory: [false, true, true] },
      }
    );
    alertInstance.setFlappingHistory([false]);
    expect(alertInstance.getFlappingHistory()).toEqual([false]);
    expect(alertInstance.toRaw()).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "flappingHistory": Array [
            false,
          ],
        },
        "state": Object {},
      }
    `);
  });
});

describe('getFlappingHistory', () => {
  test('correctly sets flappingHistory', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: { flappingHistory: [false, false] },
    });
    expect(alert.getFlappingHistory()).toEqual([false, false]);
  });
});

describe('setFlapping', () => {
  test('sets flapping', () => {
    const alertInstance = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
      '1',
      {
        meta: { flapping: true },
      }
    );
    alertInstance.setFlapping(false);
    expect(alertInstance.getFlapping()).toEqual(false);
    expect(alertInstance.toRaw()).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "flapping": false,
          "flappingHistory": Array [],
        },
        "state": Object {},
      }
    `);
  });
});

describe('getFlapping', () => {
  test('correctly sets flapping', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: { flapping: true },
    });
    expect(alert.getFlapping()).toEqual(true);
  });
});

describe('incrementPendingRecoveredCount', () => {
  test('correctly increments pendingRecoveredCount', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: { pendingRecoveredCount: 3 },
    });
    alert.incrementPendingRecoveredCount();
    expect(alert.getPendingRecoveredCount()).toEqual(4);
  });

  test('correctly increments pendingRecoveredCount when it is not already defined', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.incrementPendingRecoveredCount();
    expect(alert.getPendingRecoveredCount()).toEqual(1);
  });
});

describe('getPendingRecoveredCount', () => {
  test('returns pendingRecoveredCount', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: { pendingRecoveredCount: 3 },
    });
    expect(alert.getPendingRecoveredCount()).toEqual(3);
  });

  test('defines and returns pendingRecoveredCount when it is not already defined', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    expect(alert.getPendingRecoveredCount()).toEqual(0);
  });
});

describe('resetPendingRecoveredCount', () => {
  test('resets pendingRecoveredCount to 0', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: { pendingRecoveredCount: 3 },
    });
    alert.resetPendingRecoveredCount();
    expect(alert.getPendingRecoveredCount()).toEqual(0);
  });
});
