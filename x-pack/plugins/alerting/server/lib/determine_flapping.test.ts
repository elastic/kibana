/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { size } from 'lodash';
import { Alert } from '../alert';
import { determineFlapping } from './determine_flapping';

describe('determineFlapping', () => {
  let logger: MockedLogger;
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  beforeEach(() => {
    logger = loggerMock.create();
  });
  test('should return all active alerts regardless of flapping', () => {
    const activeAlerts = {
      '1': new Alert('1', { flappingHistory: flapping }),
      '2': new Alert('2', { flappingHistory: [false, false] }),
    };
    const { alertsToReturn } = determineFlapping(logger, activeAlerts, {});
    expect(size(alertsToReturn)).toEqual(2);
  });

  test('should return all flapping recovered alerts', () => {
    const recoveredAlerts = {
      '1': new Alert('1', { flappingHistory: flapping }),
      '2': new Alert('2', { flappingHistory: notFlapping }),
    };
    const { recoveredAlertsToReturn } = determineFlapping(logger, {}, recoveredAlerts);
    expect(size(recoveredAlertsToReturn)).toEqual(1);
  });

  test('should return all recovered alerts if flappingHistory is not at capacity', () => {
    const recoveredAlerts = {
      '1': new Alert('1', { flappingHistory: [false, false, false] }),
      '2': new Alert('2', { flappingHistory: notFlapping }),
    };
    const { recoveredAlertsToReturn } = determineFlapping(logger, {}, recoveredAlerts);
    expect(size(recoveredAlertsToReturn)).toEqual(1);
  });

  test('should log message when alert is determined to be flapping', () => {
    const activeAlerts = {
      '1': new Alert('1', { flappingHistory: flapping }),
      '2': new Alert('2', { flappingHistory: [false, false] }),
    };

    const recoveredAlerts = {
      '3': new Alert('3', { flappingHistory: flapping }),
      '4': new Alert('4', { flappingHistory: notFlapping }),
    };
    determineFlapping(logger, activeAlerts, recoveredAlerts);

    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info.mock.calls[0][0]).toContain('Alert:1 is flapping.');
    expect(logger.info.mock.calls[1][0]).toContain('Alert:3 is flapping.');
  });
});
