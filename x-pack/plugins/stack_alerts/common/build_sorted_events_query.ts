/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ESSearchRequest } from '../../../../src/core/types/elasticsearch';

interface BuildSortedEventsQueryOpts {
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;
  track_total_hits: boolean | number;
  index: estypes.Indices;
  size: number;
}

export interface BuildSortedEventsQuery extends BuildSortedEventsQueryOpts {
  filter: unknown;
  from: string;
  to: string;
  sortOrder?: 'asc' | 'desc';
  searchAfterSortId: string | number | undefined;
  timeField: string;
}

export const buildSortedEventsQuery = ({
  aggs,
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortId,
  sortOrder,
  timeField,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  track_total_hits,
}: BuildSortedEventsQuery): ESSearchRequest => {
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
    allow_no_indices: true,
    index,
    size,
    ignore_unavailable: true,
    track_total_hits: track_total_hits ?? false,
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
      ...(aggs ? { aggs } : {}),
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
    } as ESSearchRequest;
  }
  return searchQuery as ESSearchRequest;
};
