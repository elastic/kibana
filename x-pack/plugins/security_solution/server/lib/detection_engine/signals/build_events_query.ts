/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { isEmpty } from 'lodash';
import {
  SortOrderOrUndefined,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';

interface BuildEventsSearchQuery {
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  index: string[];
  from: string;
  to: string;
  filter: estypes.QueryDslQueryContainer;
  size: number;
  sortOrder?: SortOrderOrUndefined;
  searchAfterSortIds: estypes.SearchSortResults | undefined;
  timestampOverride: TimestampOverrideOrUndefined;
}

export const buildEventsSearchQuery = ({
  aggregations,
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortIds,
  sortOrder,
  timestampOverride,
}: BuildEventsSearchQuery) => {
  const defaultTimeFields = ['@timestamp'];
  const timestamps =
    timestampOverride != null ? [timestampOverride, ...defaultTimeFields] : defaultTimeFields;
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const rangeFilter: estypes.QueryDslQueryContainer[] =
    timestampOverride != null
      ? [
          {
            range: {
              [timestampOverride]: {
                lte: to,
                gte: from,
                format: 'strict_date_optional_time',
              },
            },
          },
          {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      lte: to,
                      gte: from,
                      // @ts-expect-error
                      format: 'strict_date_optional_time',
                    },
                  },
                },
                {
                  bool: {
                    must_not: {
                      exists: {
                        field: timestampOverride,
                      },
                    },
                  },
                },
              ],
            },
          },
        ]
      : [
          {
            range: {
              '@timestamp': {
                lte: to,
                gte: from,
                format: 'strict_date_optional_time',
              },
            },
          },
        ];

  const filterWithTime: estypes.QueryDslQueryContainer[] = [
    filter,
    { bool: { filter: [{ bool: { should: [...rangeFilter], minimum_should_match: 1 } }] } },
  ];

  const searchQuery = {
    allow_no_indices: true,
    index,
    size,
    ignore_unavailable: true,
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
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
        ...docFields,
      ],
      ...(aggregations ? { aggregations } : {}),
      sort: [
        ...(timestampOverride != null
          ? [
              {
                [timestampOverride]: {
                  order: sortOrder ?? 'asc',
                  unmapped_type: 'date',
                },
              },
              {
                '@timestamp': {
                  order: sortOrder ?? 'asc',
                  unmapped_type: 'date',
                },
              },
            ]
          : [
              {
                '@timestamp': {
                  order: sortOrder ?? 'asc',
                  unmapped_type: 'date',
                },
              },
            ]),
      ],
    },
  };

  if (searchAfterSortIds != null && !isEmpty(searchAfterSortIds)) {
    return {
      ...searchQuery,
      body: {
        ...searchQuery.body,
        search_after: searchAfterSortIds,
      },
    };
  }
  return searchQuery;
};
