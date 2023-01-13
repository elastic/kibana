/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import {
  ALERT_ACTION_GROUP,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { type Alert } from '../../common';
import { setFlapping, isAlertFlapping } from './set_flapping';

describe('setFlapping utilities', () => {
  describe('setFlapping()', () => {
    const flapping = new Array(16).fill(false).concat([true, true, true, true]);
    const notFlapping = new Array(20).fill(false);

    test('should correctly set flapping on alerts', () => {
      const activeAlerts: Record<string, Alert> = {
        '1': {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flapping,
        },
        '2': {
          [TIMESTAMP]: '2020-01-01T12:00:12.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: [false, false],
        },
        '3': {
          [TIMESTAMP]: '2020-01-01T12:10:12.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid3',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flapping,
          [ALERT_FLAPPING]: true,
        },
        '4': {
          [TIMESTAMP]: '2020-01-01T12:13:12.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '4',
          [ALERT_UUID]: 'uuid4',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: [false, false],
          [ALERT_FLAPPING]: true,
        },
      };

      const recoveredAlerts: Record<string, Alert> = {
        '1': {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: [true, true, true, true],
        },
        '2': {
          [TIMESTAMP]: '2020-01-01T12:00:12.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: notFlapping,
        },
        '3': {
          [TIMESTAMP]: '2020-01-01T12:10:12.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid3',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: [true, true],
          [ALERT_FLAPPING]: true,
        },
        '4': {
          [TIMESTAMP]: '2020-01-01T12:13:12.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '4',
          [ALERT_UUID]: 'uuid4',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: notFlapping,
          [ALERT_FLAPPING]: true,
        },
      };

      setFlapping(activeAlerts, recoveredAlerts);

      expect(activeAlerts['1'][ALERT_FLAPPING]).toEqual(true);
      expect(activeAlerts['2'][ALERT_FLAPPING]).toEqual(false);
      expect(activeAlerts['3'][ALERT_FLAPPING]).toEqual(true);
      expect(activeAlerts['4'][ALERT_FLAPPING]).toEqual(true);
      expect(recoveredAlerts['1'][ALERT_FLAPPING]).toEqual(true);
      expect(recoveredAlerts['2'][ALERT_FLAPPING]).toEqual(false);
      expect(recoveredAlerts['3'][ALERT_FLAPPING]).toEqual(true);
      expect(recoveredAlerts['4'][ALERT_FLAPPING]).toEqual(false);
    });
  });

  describe('isAlertFlapping()', () => {
    describe('not currently flapping', () => {
      test('returns true if the flap count exceeds the threshold', () => {
        const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
        const alert = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flappingHistory,
        };
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test("returns false the flap count doesn't exceed the threshold", () => {
        const flappingHistory = [true, true].concat(new Array(20).fill(false));
        const alert = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flappingHistory,
        };
        expect(isAlertFlapping(alert)).toEqual(false);
      });

      test('returns true if not at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(5).fill(true);
        const alert = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flappingHistory,
        };
        expect(isAlertFlapping(alert)).toEqual(true);
      });
    });

    describe('currently flapping', () => {
      test('returns true if at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(16).fill(false).concat([true, true, true, true]);
        const alert = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flappingHistory,
          [ALERT_FLAPPING]: true,
        };
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test("returns true if not at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(16).fill(false);
        const alert = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flappingHistory,
          [ALERT_FLAPPING]: true,
        };
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test('returns true if not at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(10).fill(false).concat([true, true, true, true]);
        const alert = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flappingHistory,
          [ALERT_FLAPPING]: true,
        };
        expect(isAlertFlapping(alert)).toEqual(true);
      });

      test("returns false if at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(20).fill(false);
        const alert = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_FLAPPING_HISTORY]: flappingHistory,
          [ALERT_FLAPPING]: true,
        };
        expect(isAlertFlapping(alert)).toEqual(false);
      });
    });
  });
});
