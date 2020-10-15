/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeProjection } from './index';

describe('mergeProjection', () => {
  it('overrides arrays', () => {
    expect(
      mergeProjection(
        {
          apm: { events: [] },
          body: { query: { bool: { must: [{ terms: ['a'] }] } } },
        },
        {
          apm: { events: [] },
          body: { query: { bool: { must: [{ term: 'b' }] } } },
        }
      )
    ).toEqual({
      apm: {
        events: [],
      },
      body: {
        query: {
          bool: {
            must: [
              {
                term: 'b',
              },
            ],
          },
        },
      },
    });
  });

  it('merges plain objects', () => {
    const termsAgg = { terms: { field: 'bar' } };
    expect(
      mergeProjection(
        { apm: { events: [] }, body: { query: {}, aggs: { foo: termsAgg } } },
        {
          apm: {
            events: [],
          },
          body: {
            aggs: {
              foo: { ...termsAgg, aggs: { bar: { terms: { field: 'baz' } } } },
            },
          },
        }
      )
    ).toEqual({
      apm: {
        events: [],
      },
      body: {
        query: {},
        aggs: {
          foo: {
            terms: {
              field: 'bar',
            },
            aggs: {
              bar: {
                terms: {
                  field: 'baz',
                },
              },
            },
          },
        },
      },
    });
  });
});
