/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { GroupingQueryArgs, GroupingQuery, NamedAggregation } from './types';
/** The maximum number of items to render */
export const DEFAULT_STACK_BY_FIELD0_SIZE = 10;
export const DEFAULT_STACK_BY_FIELD1_SIZE = 10;

const getOptionalSubAggregation = ({
  stackByMultipleFields1,
  stackByMultipleFields1Size,
  stackByMultipleFields1From = 0,
  stackByMultipleFields1Sort,
  additionalStatsAggregationsFields1,
}: {
  stackByMultipleFields1: string[] | undefined;
  stackByMultipleFields1Size: number;
  stackByMultipleFields1From?: number;
  stackByMultipleFields1Sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  additionalStatsAggregationsFields1: NamedAggregation[];
}): NamedAggregation | {} =>
  stackByMultipleFields1 != null && !isEmpty(stackByMultipleFields1)
    ? {
        stackByMultipleFields1: {
          multi_terms: {
            terms: stackByMultipleFields1.map((stackByMultipleField1) => ({
              field: stackByMultipleField1,
            })),
          },
          aggs: {
            bucket_truncate: {
              bucket_sort: {
                sort: stackByMultipleFields1Sort,
                from: stackByMultipleFields1From,
                size: stackByMultipleFields1Size,
              },
            },
            ...additionalStatsAggregationsFields1.reduce(
              (aggObj, subAgg) => Object.assign(aggObj, subAgg),
              {}
            ),
          },
        },
      }
    : {};

// our pagination will be broken if the stackBy field cardinality exceeds 10,000
// https://github.com/elastic/kibana/issues/151913
export const MAX_QUERY_SIZE = 10000;
export const getGroupingQuery = ({
  additionalFilters = [],
  additionalAggregationsRoot,
  additionalStatsAggregationsFields0,
  additionalStatsAggregationsFields1,
  from,
  runtimeMappings,
  stackByMultipleFields0,
  stackByMultipleFields0Size = DEFAULT_STACK_BY_FIELD0_SIZE,
  stackByMultipleFields0From,
  stackByMultipleFields0Sort,
  stackByMultipleFields1,
  stackByMultipleFields1Size = DEFAULT_STACK_BY_FIELD1_SIZE,
  stackByMultipleFields1From,
  stackByMultipleFields1Sort,
  to,
}: GroupingQueryArgs): GroupingQuery => ({
  size: 0,
  aggs: {
    stackByMultipleFields0: {
      ...(stackByMultipleFields0.length > 1
        ? {
            multi_terms: {
              terms: stackByMultipleFields0.map((stackByMultipleField0) => ({
                field: stackByMultipleField0,
              })),
              size: MAX_QUERY_SIZE,
            },
          }
        : {
            terms: {
              field: stackByMultipleFields0[0],
              size: MAX_QUERY_SIZE,
            },
          }),
      aggs: {
        ...getOptionalSubAggregation({
          stackByMultipleFields1,
          stackByMultipleFields1Size,
          stackByMultipleFields1From,
          stackByMultipleFields1Sort,
          additionalStatsAggregationsFields1,
        }),
        bucket_truncate: {
          bucket_sort: {
            sort: stackByMultipleFields0Sort,
            from: stackByMultipleFields0From,
            size: stackByMultipleFields0Size,
          },
        },
        ...additionalStatsAggregationsFields0.reduce(
          (aggObj, subAgg) => Object.assign(aggObj, subAgg),
          {}
        ),
      },
    },
    ...(additionalAggregationsRoot
      ? additionalAggregationsRoot.reduce((aggObj, subAgg) => Object.assign(aggObj, subAgg), {})
      : {}),
  },
  query: {
    bool: {
      filter: [
        ...additionalFilters,
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  },
  runtime_mappings: runtimeMappings,
  _source: false,
});
