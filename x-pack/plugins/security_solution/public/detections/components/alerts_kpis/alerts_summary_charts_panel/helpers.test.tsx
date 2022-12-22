/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseSeverityAlerts } from './helpers';
import { parsedAlerts, mockAlertsData, mockAlertsEmptyData } from './severity_donut/mock_data';
import type { AlertsResponse, AlertsBySeverityAgg } from './types';

describe('parse alerts by severity data', () => {
  test('parse alerts with data', () => {
    const res = parseSeverityAlerts(mockAlertsData as AlertsResponse<{}, AlertsBySeverityAgg>);
    expect(res).toEqual(parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseSeverityAlerts(mockAlertsEmptyData);
    expect(res).toEqual(null);
  });
});
