/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getQueryFilter, getQueryFilterWithListId } from './get_query_filter';

describe('get_query_filter', () => {
  describe('getQueryFilter', () => {
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

  describe('getQueryFilterWithListId', () => {
    test('it returns a basic kuery with the list id added and an empty filter', () => {
      const esQuery = getQueryFilterWithListId({ filter: '', listId: 'list-123' });
      expect(esQuery).toEqual({
        bool: {
          filter: [
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match: {
                      list_id: 'list-123',
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

    test('it returns a basic kuery with the list id added and a filter', () => {
      const esQuery = getQueryFilterWithListId({ filter: 'type: ip', listId: 'list-123' });
      expect(esQuery).toEqual({
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match: {
                            list_id: 'list-123',
                          },
                        },
                      ],
                    },
                  },
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
});
