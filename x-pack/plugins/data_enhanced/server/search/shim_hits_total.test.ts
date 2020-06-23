/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shimHitsTotal } from './shim_hits_total';

describe('shimHitsTotal', () => {
  test('returns the total if it is already numeric', () => {
    const result = shimHitsTotal({
      hits: {
        total: 5,
      },
    } as any);
    expect(result).toEqual({
      hits: {
        total: 5,
      },
    });
  });

  test('returns the total if it is inside `value`', () => {
    const result = shimHitsTotal({
      hits: {
        total: {
          value: 5,
        },
      },
    } as any);
    expect(result).toEqual({
      hits: {
        total: 5,
      },
    });
  });

  test('returns other properties from the response', () => {
    const result = shimHitsTotal({
      _shards: {},
      hits: {
        hits: [],
        total: {
          value: 5,
        },
      },
    } as any);
    expect(result).toEqual({
      _shards: {},
      hits: {
        hits: [],
        total: 5,
      },
    });
  });
});
