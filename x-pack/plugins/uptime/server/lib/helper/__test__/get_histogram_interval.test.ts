/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHistogramInterval } from '../get_histogram_interval';

describe('getHistogramInterval', () => {
  it('specifies the interval necessary to divide a given timespan into equal buckets, rounded to the nearest integer, expressed in ms', () => {
    const result = getHistogramInterval('now-15m', 'now', 10);
    expect(result).toEqual('90000ms');
  });

  it('will supply a default constant value for bucketCount when none is provided', () => {
    const result = getHistogramInterval('now-15m', 'now');
    expect(result).toEqual('36000ms');
  });
});
