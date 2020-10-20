/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { anomaliesMatrixHistogramConfig } from '.';
import { buildAnomaliesHistogramQuery } from './query.anomalies_histogram.dsl';

jest.mock('./query.anomalies_histogram.dsl', () => ({
  buildAnomaliesHistogramQuery: jest.fn(),
}));

describe('anomaliesMatrixHistogramConfig', () => {
  test('should export anomaliesMatrixHistogramConfig corrrectly', () => {
    expect(anomaliesMatrixHistogramConfig).toEqual({
      aggName: 'aggregations.anomalyActionGroup.buckets',
      parseKey: 'anomalies.buckets',
      buildDsl: buildAnomaliesHistogramQuery,
    });
  });
});
