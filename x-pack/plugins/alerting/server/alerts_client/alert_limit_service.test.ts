/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertLimitService } from './alert_limit_service';

describe('Alert Limit Service', () => {
  let alertLimitService: AlertLimitService;
  beforeEach(() => {
    jest.clearAllMocks();
    alertLimitService = new AlertLimitService({ maxAlerts: 1000 });
  });

  test('new AlertLimitService should set correct defaults', () => {
    expect(alertLimitService.hasReachedAlertLimit()).toEqual(false);

    // should not throw
    alertLimitService.checkLimitUsage();
  });

  test('setting and getting whether limit is reached should work as expected', () => {
    alertLimitService.setAlertLimitReached(false);
    expect(alertLimitService.hasReachedAlertLimit()).toEqual(false);

    alertLimitService.setAlertLimitReached(true);
    expect(alertLimitService.hasReachedAlertLimit()).toEqual(true);
  });

  test('should not throw when checking limit usage after requesting limit and reporting back', () => {
    const limit = alertLimitService.getAlertLimitValue();
    expect(limit).toEqual(1000);

    // externally report that limit has not been reached
    alertLimitService.setAlertLimitReached(false, true);

    // should not throw
    alertLimitService.checkLimitUsage();
  });

  test('should throw when checking limit usage after requesting limit and not reporting back', () => {
    const limit = alertLimitService.getAlertLimitValue();
    expect(limit).toEqual(1000);

    expect(() => {
      alertLimitService.checkLimitUsage();
    }).toThrowErrorMatchingInlineSnapshot(
      `"Rule has not reported whether alert limit has been reached after requesting limit value!"`
    );
  });

  test('should throw when checking limit usage after requesting limit and reporting back internally', () => {
    const limit = alertLimitService.getAlertLimitValue();
    expect(limit).toEqual(1000);

    // externally report that limit has not been reached
    alertLimitService.setAlertLimitReached(false, false);

    expect(() => {
      alertLimitService.checkLimitUsage();
    }).toThrowErrorMatchingInlineSnapshot(
      `"Rule has not reported whether alert limit has been reached after requesting limit value!"`
    );
  });
});
