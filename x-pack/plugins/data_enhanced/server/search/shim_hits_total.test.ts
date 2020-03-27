/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shimHitsTotal } from './shim_hits_total';

describe('shimHitsTotal', () => {
  test('returns the total if it is already numeric', () => {
    const result = shimHitsTotal({
      response: {
        hits: {
          total: 5,
        },
      },
    });
    expect(result).toEqual({
      response: {
        hits: {
          total: 5,
        },
      },
    });
  });

  test('returns the total if it is inside `value`', () => {
    const result = shimHitsTotal({
      response: {
        hits: {
          total: {
            value: 5,
          },
        },
      },
    });
    expect(result).toEqual({
      response: {
        hits: {
          total: 5,
        },
      },
    });
  });

  test('returns other properties from the response', () => {
    const result = shimHitsTotal({
      response: {
        _shards: {},
        hits: {
          hits: [],
          total: {
            value: 5,
          },
        },
      },
      total: 1,
    });
    expect(result).toEqual({
      response: {
        _shards: {},
        hits: {
          hits: [],
          total: 5,
        },
      },
      total: 1,
    });
  });
});
