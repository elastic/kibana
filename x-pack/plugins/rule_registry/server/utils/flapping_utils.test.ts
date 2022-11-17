/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  atCapacity,
  updateFlappingHistory,
  getCapacityDiff,
  isFlapping,
  getFlappingHistory,
} from './flapping_utils';

describe('updateFlappingHistory function', () => {
  test('correctly updates flappingHistory', () => {
    const flappingHistory = updateFlappingHistory([false, false], true);
    expect(flappingHistory).toEqual([false, false, true]);
  });

  test('correctly updates flappingHistory while maintaining a fixed size', () => {
    const flappingHistory = new Array(20).fill(false);
    const fh = updateFlappingHistory(flappingHistory, true);
    expect(fh.length).toEqual(20);
    const result = new Array(19).fill(false);
    expect(fh).toEqual(result.concat(true));
  });

  test('correctly updates flappingHistory while maintaining if array is larger than fixed size', () => {
    const flappingHistory = new Array(23).fill(false);
    const fh = updateFlappingHistory(flappingHistory, true);
    expect(fh.length).toEqual(20);
    const result = new Array(19).fill(false);
    expect(fh).toEqual(result.concat(true));
  });
});

describe('atCapacity and getCapacityDiff functions', () => {
  test('returns true if flappingHistory == set capacity', () => {
    const flappingHistory = new Array(20).fill(false);
    expect(atCapacity(flappingHistory)).toEqual(true);
    expect(getCapacityDiff(flappingHistory)).toEqual(1);
  });

  test('returns true if flappingHistory > set capacity', () => {
    const flappingHistory = new Array(25).fill(false);
    expect(atCapacity(flappingHistory)).toEqual(true);
    expect(getCapacityDiff(flappingHistory)).toEqual(6);
  });

  test('returns false if flappingHistory < set capacity', () => {
    const flappingHistory = new Array(15).fill(false);
    expect(atCapacity(flappingHistory)).toEqual(false);
  });
});

describe('isFlapping', () => {
  test('returns true if at capacity and flap count exceeds the threshold', () => {
    const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
    expect(isFlapping(flappingHistory)).toEqual(true);
  });

  test("returns false if at capacity and flap count doesn't exceed the threshold", () => {
    const flappingHistory = [true, true].concat(new Array(20).fill(false));
    expect(isFlapping(flappingHistory)).toEqual(false);
  });

  test('returns false if not at capacity', () => {
    const flappingHistory = new Array(5).fill(true);
    expect(isFlapping(flappingHistory)).toEqual(false);
  });
});

describe('getFlappingHistory', () => {
  type TestRuleState = Record<string, unknown> & {
    aRuleStateKey: string;
  };
  const initialRuleState: TestRuleState = {
    aRuleStateKey: 'INITIAL_RULE_STATE_VALUE',
  };

  test('sets flapping state to false if the alert is new', () => {
    const state = { wrapped: initialRuleState, trackedAlerts: {}, trackedAlertsRecovered: {} };
    expect(getFlappingHistory('TEST_ALERT_0', state, true, false, false, []))
      .toMatchInlineSnapshot(`
      Array [
        false,
      ]
    `);
  });

  test('sets flapping state to false on an alert that is still active', () => {
    const state = {
      wrapped: initialRuleState,
      trackedAlerts: {
        TEST_ALERT_0: {
          alertId: 'TEST_ALERT_0',
          alertUuid: 'TEST_ALERT_0_UUID',
          started: '2020-01-01T12:00:00.000Z',
          flappingHistory: [],
        },
      },
      trackedAlertsRecovered: {},
    };
    expect(getFlappingHistory('TEST_ALERT_0', state, false, false, true, []))
      .toMatchInlineSnapshot(`
      Array [
        false,
      ]
    `);
  });

  test('sets flapping state to true on an alert that is active and previously recovered', () => {
    const state = {
      wrapped: initialRuleState,
      trackedAlertsRecovered: {
        TEST_ALERT_0: {
          alertId: 'TEST_ALERT_0',
          alertUuid: 'TEST_ALERT_0_UUID',
          started: '2020-01-01T12:00:00.000Z',
          flappingHistory: [],
        },
      },
      trackedAlerts: {},
    };
    const recoveredIds = ['TEST_ALERT_0'];
    expect(getFlappingHistory('TEST_ALERT_0', state, false, false, true, recoveredIds))
      .toMatchInlineSnapshot(`
      Array [
        true,
      ]
    `);
    expect(recoveredIds).toEqual([]);
  });

  test('sets flapping state to true on an alert that is recovered and previously active', () => {
    const state = {
      wrapped: initialRuleState,
      trackedAlerts: {
        TEST_ALERT_0: {
          alertId: 'TEST_ALERT_0',
          alertUuid: 'TEST_ALERT_0_UUID',
          started: '2020-01-01T12:00:00.000Z',
          flappingHistory: [],
        },
      },
      trackedAlertsRecovered: {},
    };
    const recoveredIds = ['TEST_ALERT_0'];
    expect(getFlappingHistory('TEST_ALERT_0', state, false, true, false, recoveredIds))
      .toMatchInlineSnapshot(`
      Array [
        true,
      ]
    `);
    expect(recoveredIds).toEqual(['TEST_ALERT_0']);
  });

  test('sets flapping state to true on an alert that is still recovered', () => {
    const state = {
      wrapped: initialRuleState,
      trackedAlerts: {},
      trackedAlertsRecovered: {
        TEST_ALERT_0: {
          alertId: 'TEST_ALERT_0',
          alertUuid: 'TEST_ALERT_0_UUID',
          started: '2020-01-01T12:00:00.000Z',
          flappingHistory: [],
        },
      },
    };
    const recoveredIds = ['TEST_ALERT_0'];
    expect(getFlappingHistory('TEST_ALERT_0', state, false, true, false, recoveredIds))
      .toMatchInlineSnapshot(`
      Array [
        false,
      ]
    `);
    expect(recoveredIds).toEqual(['TEST_ALERT_0']);
  });
});
