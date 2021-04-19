/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import {
  SortOrderOrUndefined,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';

interface BuildEventsSearchQuery {
  aggregations?: Record<string, estypes.AggregationContainer>;
  index: string[];
  from: string;
  to: string;
  filter?: estypes.QueryContainer;
  size: number;
  sortOrder?: SortOrderOrUndefined;
  searchAfterSortId: string | number | undefined;
  timestampOverride: TimestampOverrideOrUndefined;
  excludeDocsWithTimestampOverride: boolean;
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
  excludeDocsWithTimestampOverride,
}: BuildEventsSearchQuery) => {
  const defaultTimeFields = ['@timestamp'];
  const timestamps =
    timestampOverride != null ? [timestampOverride, ...defaultTimeFields] : defaultTimeFields;
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const sortField =
    timestampOverride != null && !excludeDocsWithTimestampOverride
      ? timestampOverride
      : '@timestamp';

  const rangeFilter: estypes.QueryContainer[] = [
    {
      range: {
        [sortField]: {
          lte: to,
          gte: from,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];
  if (excludeDocsWithTimestampOverride) {
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
  // @ts-expect-error undefined in not assignable to QueryContainer
  // but tests contain undefined, so I suppose it's desired behaviour
  const filterWithTime: estypes.QueryContainer[] = [filter, { bool: { filter: rangeFilter } }];

  const searchQuery = {
    allow_no_indices: true,
    index,
    size,
    ignore_unavailable: true,
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
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
      ],
      ...(aggregations ? { aggregations } : {}),
      sort: [
        {
          [sortField]: {
            order: sortOrder ?? 'asc',
            unmapped_type: 'date',
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
