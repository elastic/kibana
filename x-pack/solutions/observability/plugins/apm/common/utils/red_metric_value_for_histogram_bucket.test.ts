/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nullifyEmptyRedMetricPoints } from './red_metric_value_for_histogram_bucket';

describe('nullifyEmptyRedMetricPoints', () => {
  it('returns an empty array when input is empty', () => {
    expect(nullifyEmptyRedMetricPoints([])).toEqual([]);
  });

  it('nulls all empty buckets regardless of position', () => {
    const result = nullifyEmptyRedMetricPoints([
      { x: 100, docCount: 0, y: 0 },
      { x: 200, docCount: 0, y: 0 },
      { x: 300, docCount: 10, y: 5 },
      { x: 400, docCount: 0, y: 0 },
      { x: 500, docCount: 8, y: 2 },
      { x: 600, docCount: 0, y: 0 },
    ]);

    expect(result).toEqual([
      { x: 100, y: null },
      { x: 200, y: null },
      { x: 300, y: 5 },
      { x: 400, y: null },
      { x: 500, y: 2 },
      { x: 600, y: null },
    ]);
  });

  it('nulls invalid y (null, NaN) for data-bearing buckets', () => {
    const result = nullifyEmptyRedMetricPoints([
      { x: 100, docCount: 5, y: null },
      { x: 200, docCount: 5, y: NaN },
      { x: 300, docCount: 5, y: 1 },
    ]);

    expect(result).toEqual([
      { x: 100, y: null },
      { x: 200, y: null },
      { x: 300, y: 1 },
    ]);
  });

  it('when every bucket is empty, all become null', () => {
    const result = nullifyEmptyRedMetricPoints([
      { x: 100, docCount: 0, y: 0 },
      { x: 200, docCount: 0, y: 0 },
    ]);

    expect(result).toEqual([
      { x: 100, y: null },
      { x: 200, y: null },
    ]);
  });

  it('nulls trailing empty buckets after data', () => {
    const result = nullifyEmptyRedMetricPoints([
      { x: 100, docCount: 100, y: 50 },
      { x: 200, docCount: 60, y: 30 },
      { x: 300, docCount: 0, y: 0 },
      { x: 400, docCount: 0, y: 0 },
    ]);

    expect(result).toEqual([
      { x: 100, y: 50 },
      { x: 200, y: 30 },
      { x: 300, y: null },
      { x: 400, y: null },
    ]);
  });

  it('nulls middle empty buckets between data-bearing buckets', () => {
    const result = nullifyEmptyRedMetricPoints([
      { x: 100, docCount: 10, y: 5 },
      { x: 200, docCount: 0, y: 0 },
      { x: 300, docCount: 0, y: 0 },
      { x: 400, docCount: 8, y: 2 },
    ]);

    expect(result).toEqual([
      { x: 100, y: 5 },
      { x: 200, y: null },
      { x: 300, y: null },
      { x: 400, y: 2 },
    ]);
  });

  it('does not null last bucket when it has data', () => {
    const result = nullifyEmptyRedMetricPoints([
      { x: 100, docCount: 10, y: 5 },
      { x: 200, docCount: 0, y: 0 },
      { x: 300, docCount: 8, y: 3 },
    ]);

    expect(result).toEqual([
      { x: 100, y: 5 },
      { x: 200, y: null },
      { x: 300, y: 3 },
    ]);
  });

  it('single empty bucket becomes null', () => {
    const result = nullifyEmptyRedMetricPoints([{ x: 100, docCount: 0, y: 0 }]);

    expect(result).toEqual([{ x: 100, y: null }]);
  });
});
