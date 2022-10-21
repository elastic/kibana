/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isEmpty } from 'lodash';
import type { Filter } from '@kbn/es-query';
import type {
  RuleFilterArray,
  TimestampOverride,
} from '../../../../common/detection_engine/rule_schema';
import { getQueryFilter } from './get_query_filter';

interface BuildEventsSearchQuery {
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  index: string[];
  from: string;
  to: string;
  filter: estypes.QueryDslQueryContainer;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  size: number;
  sortOrder?: estypes.SortOrder;
  searchAfterSortIds: estypes.SortResults | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  trackTotalHits?: boolean;
}

interface BuildEqlSearchRequestParams {
  query: string;
  index: string[];
  from: string;
  to: string;
  size: number;
  filters: RuleFilterArray | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  eventCategoryOverride?: string;
  timestampField?: string;
  tiebreakerField?: string;
  exceptionFilter: Filter | undefined;
}

const buildTimeRangeFilter = ({
  to,
  from,
  primaryTimestamp,
  secondaryTimestamp,
}: {
  to: string;
  from: string;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
}): estypes.QueryDslQueryContainer => {
  // The primaryTimestamp is always provided and will contain either the timestamp override field or `@timestamp` otherwise.
  // The secondaryTimestamp is `undefined` if
  //   1. timestamp override field is not specified
  //   2. timestamp override field is set and timestamp fallback is disabled
  //   3. timestamp override field is set to `@timestamp`
  // or `@timestamp` otherwise.
  //
  // If the secondaryTimestamp is provided, documents must either populate primaryTimestamp with a timestamp in the range
  // or must NOT populate the primaryTimestamp field at all and secondaryTimestamp must fall in the range.
  // If secondaryTimestamp is not provided, we simply use primaryTimestamp
  return secondaryTimestamp != null
    ? {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              range: {
                [primaryTimestamp]: {
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
                      [secondaryTimestamp]: {
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
                          field: primaryTimestamp,
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
          [primaryTimestamp]: {
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
  runtimeMappings,
  searchAfterSortIds,
  sortOrder,
  primaryTimestamp,
  secondaryTimestamp,
  trackTotalHits,
}: BuildEventsSearchQuery) => {
  const timestamps = secondaryTimestamp
    ? [primaryTimestamp, secondaryTimestamp]
    : [primaryTimestamp];
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const rangeFilter = buildTimeRangeFilter({
    to,
    from,
    primaryTimestamp,
    secondaryTimestamp,
  });

  const filterWithTime: estypes.QueryDslQueryContainer[] = [filter, rangeFilter];

  const sort: estypes.Sort = [];
  sort.push({
    [primaryTimestamp]: {
      order: sortOrder ?? 'asc',
      unmapped_type: 'date',
    },
  });
  if (secondaryTimestamp) {
    sort.push({
      [secondaryTimestamp]: {
        order: sortOrder ?? 'asc',
        unmapped_type: 'date',
      },
    });
  }

  const searchQuery = {
    allow_no_indices: true,
    runtime_mappings: runtimeMappings,
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
      runtime_mappings: runtimeMappings,
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

export const buildEqlSearchRequest = ({
  query,
  index,
  from,
  to,
  size,
  filters,
  primaryTimestamp,
  secondaryTimestamp,
  runtimeMappings,
  eventCategoryOverride,
  timestampField,
  tiebreakerField,
  exceptionFilter,
}: BuildEqlSearchRequestParams): estypes.EqlSearchRequest => {
  const timestamps = secondaryTimestamp
    ? [primaryTimestamp, secondaryTimestamp]
    : [primaryTimestamp];
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const esFilter = getQueryFilter({
    query: '',
    language: 'eql',
    filters: filters || [],
    index,
    exceptionFilter,
  });

  const rangeFilter = buildTimeRangeFilter({
    to,
    from,
    primaryTimestamp,
    secondaryTimestamp,
  });
  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter, esFilter];
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
      runtime_mappings: runtimeMappings,
      timestamp_field: timestampField,
      event_category_field: eventCategoryOverride,
      tiebreaker_field: tiebreakerField,
      fields,
    },
  };
};
