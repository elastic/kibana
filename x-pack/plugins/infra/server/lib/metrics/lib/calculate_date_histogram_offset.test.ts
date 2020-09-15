/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { calculateDateHistogramOffset } from './calculate_date_histogram_offset';
import moment from 'moment';

describe('calculateDateHistogramOffset(timerange)', () => {
  it('should just work', () => {
    const timerange = {
      from: moment('2020-01-01T00:03:32').valueOf(),
      to: moment('2020-01-01T01:03:32').valueOf(),
      interval: '1m',
      field: '@timestamp',
    };
    const offset = calculateDateHistogramOffset(timerange);
    expect(offset).toBe('-28s');
  });
});
