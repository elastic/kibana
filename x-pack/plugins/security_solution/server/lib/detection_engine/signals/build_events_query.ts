/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { buildExceptionFilter } from '@kbn/securitysolution-list-utils';
import { isEmpty } from 'lodash';
import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';
interface BuildEventsSearchQuery {
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  index: string[];
  from: string;
  to: string;
  filter: estypes.QueryDslQueryContainer;
  size: number;
  sortOrder?: estypes.SortOrder;
  searchAfterSortIds: estypes.SortResults | undefined;
  timestampOverride: TimestampOverrideOrUndefined;
  trackTotalHits?: boolean;
}

const buildTimeRangeFilter = ({
  to,
  from,
  timestampOverride,
}: {
  to: string;
  from: string;
  timestampOverride?: string;
}): estypes.QueryDslQueryContainer => {
  // If the timestampOverride is provided, documents must either populate timestampOverride with a timestamp in the range
  // or must NOT populate the timestampOverride field at all and `@timestamp` must fall in the range.
  // If timestampOverride is not provided, we simply use `@timestamp`
  return timestampOverride != null
    ? {
        bool: {
          minimum_should_match: 1,
          should: [
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
          ],
        },
      }
    : {
        range: {
          '@timestamp': {
            lte: to,
            gte: from,
            format: 'strict_date_optional_time',
          },
        },
      };
};

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
  trackTotalHits,
}: BuildEventsSearchQuery) => {
  const defaultTimeFields = ['@timestamp'];
  const timestamps =
    timestampOverride != null ? [timestampOverride, ...defaultTimeFields] : defaultTimeFields;
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const rangeFilter = buildTimeRangeFilter({ to, from, timestampOverride });

  const filterWithTime: estypes.QueryDslQueryContainer[] = [filter, rangeFilter];

  const sort: estypes.Sort = [];
  if (timestampOverride) {
    sort.push({
      [timestampOverride]: {
        order: sortOrder ?? 'asc',
        unmapped_type: 'date',
      },
    });
  }
  sort.push({
    '@timestamp': {
      order: sortOrder ?? 'asc',
      unmapped_type: 'date',
    },
  });

  const searchQuery = {
    allow_no_indices: true,
    index,
    size,
    ignore_unavailable: true,
    track_total_hits: trackTotalHits,
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
      sort,
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

export const buildEqlSearchRequest = (
  query: string,
  index: string[],
  from: string,
  to: string,
  size: number,
  timestampOverride: TimestampOverrideOrUndefined,
  exceptionLists: ExceptionListItemSchema[],
  eventCategoryOverride: string | undefined
): estypes.EqlSearchRequest => {
  const defaultTimeFields = ['@timestamp'];
  const timestamps =
    timestampOverride != null ? [timestampOverride, ...defaultTimeFields] : defaultTimeFields;
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  // Assume that `indices.query.bool.max_clause_count` is at least 1024 (the default value),
  // allowing us to make 1024-item chunks of exception list items.
  // Discussion at https://issues.apache.org/jira/browse/LUCENE-4835 indicates that 1024 is a
  // very conservative value.
  const exceptionFilter = buildExceptionFilter({
    lists: exceptionLists,
    excludeExceptions: true,
    chunkSize: 1024,
    alias: null,
  });

  const rangeFilter = buildTimeRangeFilter({ to, from, timestampOverride });
  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter];
  if (exceptionFilter !== undefined) {
    requestFilter.push({
      bool: {
        must_not: {
          bool: exceptionFilter.query?.bool,
        },
      },
    });
  }
  const fields = [
    {
      field: '*',
      include_unmapped: true,
    },
    ...docFields,
  ];
  return {
    index,
    allow_no_indices: true,
    body: {
      size,
      query,
      filter: {
        bool: {
          filter: requestFilter,
        },
      },
      event_category_field: eventCategoryOverride,
      fields,
    },
  };
};
