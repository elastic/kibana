/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdatedFlappingHistory } from './get_updated_flapping_history';

describe('getUpdatedFlappingHistory', () => {
  type TestRuleState = Record<string, unknown> & {
    aRuleStateKey: string;
  };
  const initialRuleState: TestRuleState = {
    aRuleStateKey: 'INITIAL_RULE_STATE_VALUE',
  };

  test('sets flapping state to true if the alert is new', () => {
    const state = { wrapped: initialRuleState, trackedAlerts: {}, trackedAlertsRecovered: {} };
    expect(getUpdatedFlappingHistory('TEST_ALERT_0', state, true, false, false, []))
      .toMatchInlineSnapshot(`
      Array [
        true,
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
          flapping: false,
        },
      },
      trackedAlertsRecovered: {},
    };
    expect(getUpdatedFlappingHistory('TEST_ALERT_0', state, false, false, true, []))
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
          flapping: false,
        },
      },
      trackedAlerts: {},
    };
    const recoveredIds = ['TEST_ALERT_0'];
    expect(getUpdatedFlappingHistory('TEST_ALERT_0', state, true, false, true, recoveredIds))
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
          flapping: false,
        },
      },
      trackedAlertsRecovered: {},
    };
    const recoveredIds = ['TEST_ALERT_0'];
    expect(getUpdatedFlappingHistory('TEST_ALERT_0', state, false, true, false, recoveredIds))
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
          flapping: false,
        },
      },
    };
    const recoveredIds = ['TEST_ALERT_0'];
    expect(getUpdatedFlappingHistory('TEST_ALERT_0', state, false, true, false, recoveredIds))
      .toMatchInlineSnapshot(`
      Array [
        false,
      ]
    `);
    expect(recoveredIds).toEqual(['TEST_ALERT_0']);
  });
});
