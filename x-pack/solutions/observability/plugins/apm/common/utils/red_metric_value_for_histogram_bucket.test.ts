/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nullifyLeadingTrailingEmptyRedMetricPoints } from './red_metric_value_for_histogram_bucket';

describe('nullifyLeadingTrailingEmptyRedMetricPoints', () => {
  it('returns an empty array when input is empty', () => {
    expect(nullifyLeadingTrailingEmptyRedMetricPoints([])).toEqual([]);
  });

  it('nulls y only for leading and trailing empty buckets, not middle gaps', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints([
      { x: 1, docCount: 0, y: 0 },
      { x: 2, docCount: 0, y: 0 },
      { x: 3, docCount: 10, y: 5 },
      { x: 4, docCount: 0, y: 0 },
      { x: 5, docCount: 8, y: 2 },
      { x: 6, docCount: 0, y: 0 },
    ]);

    expect(result).toEqual([
      { x: 1, y: null },
      { x: 2, y: null },
      { x: 3, y: 5 },
      { x: 4, y: 0 },
      { x: 5, y: 2 },
      { x: 6, y: null },
    ]);
  });

  it('nulls invalid y (null, NaN) for non-edge empty buckets as well', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints([
      { x: 1, docCount: 5, y: null },
      { x: 2, docCount: 5, y: NaN },
      { x: 3, docCount: 5, y: 1 },
    ]);

    expect(result).toEqual([
      { x: 1, y: null },
      { x: 2, y: null },
      { x: 3, y: 1 },
    ]);
  });

  it('when every bucket is empty, all y become null', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints([
      { x: 1, docCount: 0, y: 0 },
      { x: 2, docCount: 0, y: 0 },
    ]);

    expect(result).toEqual([
      { x: 1, y: null },
      { x: 2, y: null },
    ]);
  });
});
