/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BuildSortedEventsQuery {
  aggregations?: unknown;
  index: string[];
  from: string;
  to: string;
  filter: unknown;
  size: number;
  sortOrder?: 'asc' | 'desc' | undefined;
  searchAfterSortId: string | number | undefined;
  timeField: string;
}

export const buildSortedEventsQuery = ({
  aggregations,
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortId,
  sortOrder,
  timeField,
}: BuildSortedEventsQuery) => {
  const sortField = timeField;
  const docFields = [timeField].map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const rangeFilter: unknown[] = [
    {
      range: {
        [timeField]: {
          lte: to,
          gte: from,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];
  const filterWithTime = [filter, { bool: { filter: rangeFilter } }];

  const searchQuery = {
    allowNoIndices: true,
    index,
    size,
    ignoreUnavailable: true,
    track_total_hits: true,
    body: {
      docvalue_fields: docFields,
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
      ...(aggregations ? { aggregations } : {}),
      sort: [
        {
          [sortField]: {
            order: sortOrder ?? 'asc',
          },
        },
      ],
    },
  };

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
