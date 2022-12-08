/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
<<<<<<< HEAD
import { parseSeverityAlerts } from './helpers';
import { parsedAlerts, mockAlertsData, mockAlertsEmptyData } from './severity_donut/mock_data';
import type { AlertsResponse, AlertsBySeverityAgg } from './types';

describe('parse alerts by severity data', () => {
  test('parse alerts with data', () => {
    const res = parseSeverityAlerts(mockAlertsData as AlertsResponse<{}, AlertsBySeverityAgg>);
=======
import { parseAlertsData } from './helpers';
import { parsedAlerts, mockAlertsData, mockAlertsEmptyData } from './mock_data';
import type { AlertsBySeverityResponse, AlertsBySeverityAgg } from './types';

describe('parseAlertsData', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsData(
      mockAlertsData as AlertsBySeverityResponse<{}, AlertsBySeverityAgg>
    );
>>>>>>> 4f0745e5da5b22122d18b2b9dce99737ad2e8f18
    expect(res).toEqual(parsedAlerts);
  });

  test('parse alerts without data', () => {
<<<<<<< HEAD
    const res = parseSeverityAlerts(mockAlertsEmptyData);
=======
    const res = parseAlertsData(mockAlertsEmptyData);
>>>>>>> 4f0745e5da5b22122d18b2b9dce99737ad2e8f18
    expect(res).toEqual(null);
  });
});
