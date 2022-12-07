/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAlertsData } from './helpers';
import { parsedAlerts, mockAlertsData, mockAlertsEmptyData } from './mock_data';
import type { AlertsBySeverityResponse, AlertsBySeverityAgg } from './types';

describe('parseAlertsData', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsData(
      mockAlertsData as AlertsBySeverityResponse<{}, AlertsBySeverityAgg>
    );
    expect(res).toEqual(parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseAlertsData(mockAlertsEmptyData);
    expect(res).toEqual(null);
  });
});
