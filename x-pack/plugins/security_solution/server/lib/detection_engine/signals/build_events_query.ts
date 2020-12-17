/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SortOrderOrUndefined,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';

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
  timestamp?: string;
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
  timestamp,
}: BuildEventsSearchQuery) => {
  const defaultTimeFields = ['@timestamp'];
  const timestamps =
    timestampOverride != null && timestampOverride !== '@timestamp'
      ? [timestampOverride, ...defaultTimeFields]
      : defaultTimeFields;
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  // idea is to iterate over the timestamps and create distinct queries that can be used to search across simultaneous timestamps
  const sortField =
    timestamp == null && timestampOverride != null ? timestampOverride : '@timestamp';

  const rangeFilter: unknown[] = [
    {
      bool: {
        should: [
          {
            range: {
              [sortField]: {
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
              [sortField]: {
                lte: to,
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];
  if (timestamp != null) {
    rangeFilter.push({
      bool: {
        must_not: {
          exists: {
            field: timestampOverride,
          },
        },
      },
    });
  }
  const filterWithTime = [filter, { bool: { filter: rangeFilter } }];

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
          [sortField]: {
            order: sortOrder ?? 'asc',
          },
        },
      ],
    },
  };

  // console.error(`SEARCH QUERY: ${JSON.stringify(searchQuery.body)}`);

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
