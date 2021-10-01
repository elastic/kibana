/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMatrixHistogramConfig } from '.';
import { buildAlertsHistogramQuery } from './query.alerts_histogram.dsl';

jest.mock('./query.alerts_histogram.dsl', () => ({
  buildAlertsHistogramQuery: jest.fn(),
}));

describe('alertsMatrixHistogramConfig', () => {
  test('should export alertsMatrixHistogramConfig corrrectly', () => {
    expect(alertsMatrixHistogramConfig).toEqual({
      aggName: 'aggregations.alertsGroup.buckets',
      parseKey: 'alerts.buckets',
      buildDsl: buildAlertsHistogramQuery,
    });
  });
});
