/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';

interface BuildEventsSearchQuery {
  aggregations?: unknown;
  index: string[];
  from: string;
  to: string;
  filter: unknown;
  size: number;
  sortOrder?: SortOrderOrUndefined;
  searchAfterSortId: string | number | undefined;
  timestampOverride: TimestampOverrideOrUndefined;
}

export const buildEventsSearchQuery = ({
  aggregations,
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortId,
  sortOrder,
  timestampOverride,
}: BuildEventsSearchQuery) => {
  const timestamp = timestampOverride ?? '@timestamp';
  const docFields =
    timestampOverride != null
      ? [
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
          {
            field: timestampOverride,
            format: 'strict_date_optional_time',
          },
        ]
      : [
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ];

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
                    [timestamp]: {
                      gte: from,
                      format: 'strict_date_optional_time',
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
                    [timestamp]: {
                      lte: to,
                      format: 'strict_date_optional_time',
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

  const searchQuery = {
    allowNoIndices: true,
    index,
    size,
    ignoreUnavailable: true,
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
          [timestamp]: {
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
