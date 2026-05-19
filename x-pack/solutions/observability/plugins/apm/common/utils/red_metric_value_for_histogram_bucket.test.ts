/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nullifyLeadingTrailingEmptyRedMetricPoints } from './red_metric_value_for_histogram_bucket';

describe('nullifyLeadingTrailingEmptyRedMetricPoints', () => {
  const now = 1000;

  it('returns an empty array when input is empty', () => {
    expect(nullifyLeadingTrailingEmptyRedMetricPoints([], now)).toEqual([]);
  });

  it('nulls leading empty buckets and keeps middle + past trailing zeros', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints(
      [
        { x: 100, docCount: 0, y: 0 },
        { x: 200, docCount: 0, y: 0 },
        { x: 300, docCount: 10, y: 5 },
        { x: 400, docCount: 0, y: 0 },
        { x: 500, docCount: 8, y: 2 },
        { x: 600, docCount: 0, y: 0 },
      ],
      now
    );

    expect(result).toEqual([
      { x: 100, y: null },
      { x: 200, y: null },
      { x: 300, y: 5 },
      { x: 400, y: 0 },
      { x: 500, y: 2 },
      { x: 600, y: 0 },
    ]);
  });

  it('nulls invalid y (null, NaN) for non-edge empty buckets as well', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints(
      [
        { x: 100, docCount: 5, y: null },
        { x: 200, docCount: 5, y: NaN },
        { x: 300, docCount: 5, y: 1 },
      ],
      now
    );

    expect(result).toEqual([
      { x: 100, y: null },
      { x: 200, y: null },
      { x: 300, y: 1 },
    ]);
  });

  it('when every bucket is empty, all y become null', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints(
      [
        { x: 100, docCount: 0, y: 0 },
        { x: 200, docCount: 0, y: 0 },
      ],
      now
    );

    expect(result).toEqual([
      { x: 100, y: null },
      { x: 200, y: null },
    ]);
  });

  it('shows trailing zeros when a service stops sending data (catastrophic failure)', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints(
      [
        { x: 100, docCount: 100, y: 50 },
        { x: 200, docCount: 60, y: 30 },
        { x: 300, docCount: 0, y: 0 },
        { x: 400, docCount: 0, y: 0 },
      ],
      now
    );

    expect(result).toEqual([
      { x: 100, y: 50 },
      { x: 200, y: 30 },
      { x: 300, y: 0 },
      { x: 400, y: 0 },
    ]);
  });

  it('nulls future trailing empty buckets (dotted line for not-yet-observed)', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints(
      [
        { x: 100, docCount: 100, y: 50 },
        { x: 200, docCount: 60, y: 30 },
        { x: 300, docCount: 0, y: 0 },
        { x: 1000, docCount: 0, y: 0 },
        { x: 1100, docCount: 0, y: 0 },
      ],
      now
    );

    expect(result).toEqual([
      { x: 100, y: 50 },
      { x: 200, y: 30 },
      { x: 300, y: 0 },
      { x: 1000, y: null },
      { x: 1100, y: null },
    ]);
  });

  it('handles mix of past zeros and future empty at the trailing edge', () => {
    const result = nullifyLeadingTrailingEmptyRedMetricPoints(
      [
        { x: 100, docCount: 50, y: 25 },
        { x: 500, docCount: 0, y: 0 },
        { x: 800, docCount: 0, y: 0 },
        { x: 1200, docCount: 0, y: 0 },
      ],
      now
    );

    expect(result).toEqual([
      { x: 100, y: 25 },
      { x: 500, y: 0 },
      { x: 800, y: 0 },
      { x: 1200, y: null },
    ]);
  });
});
