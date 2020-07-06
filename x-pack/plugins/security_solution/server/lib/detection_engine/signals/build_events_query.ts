/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface BuildEventsSearchQuery {
  index: string[];
  from: string;
  to: string;
  filter: unknown;
  size: number;
  searchAfterSortId: string | number | undefined;
}

export const buildEventsSearchQuery = ({
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortId,
  threshold,
}: BuildEventsSearchQuery) => {
  const filterWithTime = [
    filter,
    {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  range: {
                    '@timestamp': {
                      gte: from,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  range: {
                    '@timestamp': {
                      lte: to,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  ];
  const aggregations = threshold
    ? {
        aggs: {
          threshold: {
            terms: {
              field: threshold.field,
              min_doc_count: threshold.value,
            },
          },
        },
      }
    : {};
  const searchQuery = {
    allowNoIndices: true,
    index,
    size,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            ...filterWithTime,
            {
              match_all: {},
            },
          ],
        },
      },
      ...aggregations,
      sort: [
        {
          '@timestamp': {
            order: 'asc',
          },
        },
      ],
    },
  };

  console.log('searchQuery', JSON.stringify(searchQuery, null, 2));

  if (searchAfterSortId) {
    return {
      ...searchQuery,
      body: {
        ...searchQuery.body,
        search_after: [searchAfterSortId],
      },
    };
  }
  return searchQuery;
};
