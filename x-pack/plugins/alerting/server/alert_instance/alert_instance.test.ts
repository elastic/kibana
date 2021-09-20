/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { AlertInstance } from './alert_instance';
import { AlertInstanceState, AlertInstanceContext, DefaultActionGroupId } from '../../common';

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers();
});
beforeEach(() => clock.reset());
afterAll(() => clock.restore());

describe('hasScheduledActions()', () => {
  test('defaults to false', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    expect(alertInstance.hasScheduledActions()).toEqual(false);
  });

  test('returns true when scheduleActions is called', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    alertInstance.scheduleActions('default');
    expect(alertInstance.hasScheduledActions()).toEqual(true);
  });
});

describe('isThrottled', () => {
  test(`should throttle when group didn't change and throttle period is still active`, () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
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
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
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
    const alertInstance = new AlertInstance<never, never, 'default' | 'other-group'>({
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

describe('scheduledActionGroupOrSubgroupHasChanged()', () => {
  test('should be false if no last scheduled and nothing scheduled', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be false if group does not change', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alertInstance.scheduleActions('default');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be false if group and subgroup does not change', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alertInstance.scheduleActionsWithSubGroup('default', 'subgroup');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be false if group does not change and subgroup goes from undefined to defined', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alertInstance.scheduleActionsWithSubGroup('default', 'subgroup');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be false if group does not change and subgroup goes from defined to undefined', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alertInstance.scheduleActions('default');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(false);
  });

  test('should be true if no last scheduled and has scheduled action', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    alertInstance.scheduleActions('default');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
  });

  test('should be true if group does change', () => {
    const alertInstance = new AlertInstance<never, never, 'default' | 'penguin'>({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alertInstance.scheduleActions('penguin');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
  });

  test('should be true if group does change and subgroup does change', () => {
    const alertInstance = new AlertInstance<never, never, 'default' | 'penguin'>({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alertInstance.scheduleActionsWithSubGroup('penguin', 'fish');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
  });

  test('should be true if group does not change and subgroup does change', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alertInstance.scheduleActionsWithSubGroup('default', 'fish');
    expect(alertInstance.scheduledActionGroupOrSubgroupHasChanged()).toEqual(true);
  });
});

describe('getScheduledActionOptions()', () => {
  test('defaults to undefined', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    expect(alertInstance.getScheduledActionOptions()).toBeUndefined();
  });
});

describe('unscheduleActions()', () => {
  test('makes hasScheduledActions() return false', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    alertInstance.scheduleActions('default');
    expect(alertInstance.hasScheduledActions()).toEqual(true);
    alertInstance.unscheduleActions();
    expect(alertInstance.hasScheduledActions()).toEqual(false);
  });

  test('makes getScheduledActionOptions() return undefined', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
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
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({ state });
    expect(alertInstance.getState()).toEqual(state);
  });
});

describe('scheduleActions()', () => {
  test('makes hasScheduledActions() return true', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
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
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
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
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
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
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({ state: { foo: true }, meta: {} });
    alertInstance.replaceState({ otherField: true }).scheduleActions('default', { field: true });
    expect(alertInstance.getScheduledActionOptions()).toEqual({
      actionGroup: 'default',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot schdule for execution twice', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    alertInstance.scheduleActions('default', { field: true });
    expect(() =>
      alertInstance.scheduleActions('default', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });
});

describe('scheduleActionsWithSubGroup()', () => {
  test('makes hasScheduledActions() return true', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alertInstance
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alertInstance.hasScheduledActions()).toEqual(true);
  });

  test('makes isThrottled() return true when throttled and subgroup is the same', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'subgroup',
        },
      },
    });
    alertInstance
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alertInstance.isThrottled('1m')).toEqual(true);
  });

  test('makes isThrottled() return true when throttled and last schedule had no subgroup', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alertInstance
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alertInstance.isThrottled('1m')).toEqual(true);
  });

  test('makes isThrottled() return false when throttled and subgroup is the different', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
          subgroup: 'prev-subgroup',
        },
      },
    });
    alertInstance
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alertInstance.isThrottled('1m')).toEqual(false);
  });

  test('make isThrottled() return false when throttled expired', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
      state: { foo: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    clock.tick(120000);
    alertInstance
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alertInstance.isThrottled('1m')).toEqual(false);
  });

  test('makes getScheduledActionOptions() return given options', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({ state: { foo: true }, meta: {} });
    alertInstance
      .replaceState({ otherField: true })
      .scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(alertInstance.getScheduledActionOptions()).toEqual({
      actionGroup: 'default',
      subgroup: 'subgroup',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot schdule for execution twice', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    alertInstance.scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(() =>
      alertInstance.scheduleActionsWithSubGroup('default', 'subgroup', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });

  test('cannot schdule for execution twice with different subgroups', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    alertInstance.scheduleActionsWithSubGroup('default', 'subgroup', { field: true });
    expect(() =>
      alertInstance.scheduleActionsWithSubGroup('default', 'subgroup', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });

  test('cannot schdule for execution twice whether there are subgroups', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >();
    alertInstance.scheduleActions('default', { field: true });
    expect(() =>
      alertInstance.scheduleActionsWithSubGroup('default', 'subgroup', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert instance execution has already been scheduled, cannot schedule twice"`
    );
  });
});

describe('replaceState()', () => {
  test('replaces previous state', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({ state: { foo: true } });
    alertInstance.replaceState({ bar: true });
    expect(alertInstance.getState()).toEqual({ bar: true });
    alertInstance.replaceState({ baz: true });
    expect(alertInstance.getState()).toEqual({ baz: true });
  });
});

describe('updateLastScheduledActions()', () => {
  test('replaces previous lastScheduledActions', () => {
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({ meta: {} });
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
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >({
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
    const alertInstance = new AlertInstance<
      AlertInstanceState,
      AlertInstanceContext,
      DefaultActionGroupId
    >(raw);
    expect(alertInstance.toRaw()).toEqual(raw);
  });
});
