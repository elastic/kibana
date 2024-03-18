/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRangeQuery } from './get_range_query';

describe('getRangeQuery', () => {
  it('returns a range filter with default time field', () => {
    const query = getRangeQuery(0, 50);
    expect(query).toEqual({
      range: {
        '@timestamp': {
          gte: 0,
          lte: 50,
          format: 'epoch_millis',
        },
      },
    });
  });

  it('returns a range filter with a custom time field', () => {
    const query = getRangeQuery(0, 50, 'the-time-field');
    expect(query).toEqual({
      range: {
        'the-time-field': {
          gte: 0,
          lte: 50,
          format: 'epoch_millis',
        },
      },
    });
  });
});
