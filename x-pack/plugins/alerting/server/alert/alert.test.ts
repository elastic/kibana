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
    expect(alert.isThrottled('1m')).toEqual(true);
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
    expect(alert.isThrottled('15s')).toEqual(false);
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
    expect(alert.isThrottled('1m')).toEqual(false);
  });
});

describe('scheduledActionGroupOrSubgroupHasChanged()', () => {
  test('should be false if no last scheduled and nothing scheduled', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
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
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be false if group and subgroup does not change', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alert.scheduleActionsWithSubGroup('default', 'subgroup');
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be false if group does not change and subgroup goes from undefined to defined', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.scheduleActionsWithSubGroup('default', 'subgroup');
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be false if group does not change and subgroup goes from defined to undefined', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alert.scheduleActions('default');
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be true if no last scheduled and has scheduled action', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActions('default');
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
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
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
  });

  test('should be true if group does change and subgroup does change', () => {
    const alert = new Alert<never, never, 'default' | 'penguin'>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alert.scheduleActionsWithSubGroup('penguin', 'fish');
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
  });

  test('should be true if group does not change and subgroup does change', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alert.scheduleActionsWithSubGroup('default', 'fish');
    expect(alert.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
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
    expect(alert.isThrottled('1m')).toEqual(true);
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
    expect(alert.isThrottled('1m')).toEqual(false);
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

describe('scheduleActionsWithSubGroup()', () => {
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
    alert
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alert.hasScheduledActions()).toEqual(true);
  });

  test('makes isThrottled() return true when throttled and subgroup is the same', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alert
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alert.isThrottled('1m')).toEqual(true);
  });

  test('makes isThrottled() return true when throttled and last schedule had no subgroup', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alert.isThrottled('1m')).toEqual(true);
  });

  test('makes isThrottled() return false when throttled and subgroup is the different', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'prev-subgroup',
        },
      },
    });
    alert
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alert.isThrottled('1m')).toEqual(false);
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
    alert
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alert.isThrottled('1m')).toEqual(false);
  });

  test('makes getScheduledActionOptions() return given options', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { foo: true },
      meta: {},
    });
    alert
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alert.getScheduledActionOptions()).toEqual({
      actionGroup: 'default',
      subgroup: 'subgroup',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot schdule for execution twice', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(() =>
      alert.scheduleActionsWithSubGroup('default', 'subgroup', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });

  test('cannot schdule for execution twice with different subgroups', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(() =>
      alert.scheduleActionsWithSubGroup('default', 'subgroup', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });

  test('cannot schdule for execution twice whether there are subgroups', () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1');
    alert.scheduleActions('default', { field: true });
    expect(() =>
      alert.scheduleActionsWithSubGroup('default', 'subgroup', { field: false })
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
        },
      }
    );
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
    const alertInstance = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
      '1',
      raw
    );
    expect(alertInstance.toRaw()).toEqual(raw);
  });
});
