/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getQueryFilter } from './get_query_filter';

describe('get_query_filter', () => {
  test('it should work with a basic kuery', () => {
    const esQuery = getQueryFilter({ filter: 'type: ip' });
    expect(esQuery).toEqual({
      bool: {
        filter: [
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match: {
                    type: 'ip',
                  },
                },
              ],
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    });
  });
});
