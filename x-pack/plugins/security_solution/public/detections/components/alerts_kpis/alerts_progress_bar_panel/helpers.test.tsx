/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAlertsGroupingData, getNonEmptyPercent } from './helpers';
import * as mock from './mock_data';
import type { AlertsByGroupingAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse progress bar data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsGroupingData(
      mock.mockAlertsData as AlertSearchResponse<{}, AlertsByGroupingAgg>
    );
    expect(res).toEqual(mock.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseAlertsGroupingData(
      mock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByGroupingAgg>
    );
    expect(res).toEqual([]);
  });
});

describe('test non-empty percentage', () => {
  test('should return correct non-empty percentage', () => {
    const expected = Math.round((620 / 630) * 100);
    const res = getNonEmptyPercent(mock.parsedAlerts);
    expect(res).toEqual(expected);
  });
});
