/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { size } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext, DefaultActionGroupId } from '../../common';
import { atCapacity, determineFlapping, isFlapping } from './determine_flapping';

describe('determineFlapping', () => {
  let logger: MockedLogger;
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  beforeEach(() => {
    logger = loggerMock.create();
  });
  test('should return all active alerts regardless of flapping', () => {
    const activeAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
    };
    const { alertsToReturn } = determineFlapping(logger, activeAlerts, {});
    expect(size(alertsToReturn)).toEqual(2);
  });

  test('should return all flapping recovered alerts', () => {
    const recoveredAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
    };
    const { recoveredAlertsToReturn } = determineFlapping(logger, {}, recoveredAlerts);
    expect(size(recoveredAlertsToReturn)).toEqual(1);
  });

  test('should return all recovered alerts if flappingHistory is not at capacity', () => {
    const recoveredAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: [false, false, false] } }),
      '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
    };
    const { recoveredAlertsToReturn } = determineFlapping(logger, {}, recoveredAlerts);
    expect(size(recoveredAlertsToReturn)).toEqual(1);
  });

  test('should log message when alert is determined to be flapping', () => {
    const activeAlerts = {
      '1': new Alert('1', { meta: { flappingHistory: flapping } }),
      '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
    };

    const recoveredAlerts = {
      '3': new Alert('3', { meta: { flappingHistory: flapping } }),
      '4': new Alert('4', { meta: { flappingHistory: notFlapping } }),
    };
    determineFlapping(logger, activeAlerts, recoveredAlerts);

    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info.mock.calls[0][0]).toContain('Alert:1 is flapping.');
    expect(logger.info.mock.calls[1][0]).toContain('Alert:3 is flapping.');
  });

  describe('isFlapping', () => {
    test('returns true if at capacity and flap count exceeds the threshold', () => {
      const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(isFlapping(alert)).toEqual(true);
    });

    test("returns false if at capacity and flap count doesn't exceed the threshold", () => {
      const flappingHistory = [true, true].concat(new Array(20).fill(false));
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(isFlapping(alert)).toEqual(false);
    });

    test('returns false if not at capacity', () => {
      const flappingHistory = new Array(5).fill(true);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
        meta: { flappingHistory },
      });
      expect(isFlapping(alert)).toEqual(false);
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
