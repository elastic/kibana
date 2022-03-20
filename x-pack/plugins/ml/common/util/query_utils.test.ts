/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addExcludeFrozenToQuery } from './query_utils';

describe('Util: addExcludeFrozenToQuery()', () => {
  test('Validation checks.', () => {
    expect(
      addExcludeFrozenToQuery({
        match_all: {},
        bool: {
          must: [
            {
              match_all: {},
            },
          ],
        },
      })
    ).toMatchObject({
      bool: {
        must: [{ match_all: {} }],
        must_not: [{ term: { _tier: { value: 'data_frozen' } } }],
      },
    });

    expect(
      addExcludeFrozenToQuery({
        bool: {
          must: [],
          must_not: {
            term: {
              category: {
                value: 'clothing',
              },
            },
          },
        },
      })
    ).toMatchObject({
      bool: {
        must: [],
        must_not: [
          { term: { category: { value: 'clothing' } } },
          { term: { _tier: { value: 'data_frozen' } } },
        ],
      },
    });

    expect(
      addExcludeFrozenToQuery({
        bool: {
          must: [],
          must_not: [{ term: { category: { value: 'clothing' } } }],
        },
      })
    ).toMatchObject({
      bool: {
        must: [],
        must_not: [
          { term: { category: { value: 'clothing' } } },
          { term: { _tier: { value: 'data_frozen' } } },
        ],
      },
    });

    expect(addExcludeFrozenToQuery(undefined)).toMatchObject({
      bool: {
        must_not: [{ term: { _tier: { value: 'data_frozen' } } }],
      },
    });
  });
});
