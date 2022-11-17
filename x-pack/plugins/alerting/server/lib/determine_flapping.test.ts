/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys, size } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext, DefaultActionGroupId } from '../../common';
import {
  atCapacity,
  determineAlertsToReturn,
  determineFlapping,
  isFlapping,
} from './determine_flapping';

describe('determineFlapping', () => {
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  test('should return all active alerts regardless of flapping', () => {
    const activeAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
    };
    const { alertsToReturn } = determineAlertsToReturn(activeAlerts, {});
    expect(size(alertsToReturn)).toEqual(2);
  });

  test('should return all flapping recovered alerts', () => {
    const recoveredAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
    };
    const { recoveredAlertsToReturn } = determineAlertsToReturn({}, recoveredAlerts);
    expect(keys(recoveredAlertsToReturn)).toEqual(['1']);
  });

  test('should return all recovered alerts if flappingHistory is not at capacity', () => {
    const recoveredAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: [false, false, false] } }),
      '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
    };
    const { recoveredAlertsToReturn } = determineAlertsToReturn({}, recoveredAlerts);
    expect(keys(recoveredAlertsToReturn)).toEqual(['1']);
  });

  test('should return id when an alert is determined to be flapping', () => {
    const activeAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
    };

    const flappingAlertIds = determineFlapping(activeAlerts);

    expect(flappingAlertIds).toMatchInlineSnapshot(`
      Set {
        "1",
      }
    `);
  });

  describe('isFlapping', () => {
    test('returns true if the flap count exceeds the threshold', () => {
      const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(isFlapping(alert)).toEqual(true);
    });

    test("returns false the flap count doesn't exceed the threshold", () => {
      const flappingHistory = [true, true].concat(new Array(20).fill(false));
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(isFlapping(alert)).toEqual(false);
    });

    test('returns true if not at capacity and the flap count exceeds the threshold', () => {
      const flappingHistory = new Array(5).fill(true);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(isFlapping(alert)).toEqual(true);
    });
  });

  describe('atCapacity', () => {
    test('returns true if flappingHistory == set capacity', () => {
      const flappingHistory = new Array(20).fill(false);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(atCapacity(alert.getFlappingHistory())).toEqual(true);
    });

    test('returns true if flappingHistory > set capacity', () => {
      const flappingHistory = new Array(25).fill(false);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(atCapacity(alert.getFlappingHistory())).toEqual(true);
    });

    test('returns false if flappingHistory < set capacity', () => {
      const flappingHistory = new Array(15).fill(false);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(atCapacity(alert.getFlappingHistory())).toEqual(false);
    });
  });
});
