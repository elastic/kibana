/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/** The maximum number of items to render */
export const DEFAULT_STACK_BY_FIELD0_SIZE = 10;
export const DEFAULT_STACK_BY_FIELD1_SIZE = 10;

interface OptionalSubAggregation {
  stackByMupltipleFields1: {
    multi_terms: {
      terms: Array<{
        field: string;
      }>;
    };
  };
}

export interface CardinalitySubAggregation {
  [category: string]: {
    cardinality: {
      field: string;
    };
  };
}

export interface TermsSubAggregation {
  [category: string]: {
    terms: {
      field: string;
      exclude?: string[];
    };
  };
}

export const getOptionalSubAggregation = ({
  stackByMupltipleFields1,
  stackByMupltipleFields1Size,
  stackByMupltipleFields1From = 0,
  stackByMupltipleFields1Sort,
  additionalStatsAggregationsFields1,
}: {
  stackByMupltipleFields1: string[] | undefined;
  stackByMupltipleFields1Size: number;
  stackByMupltipleFields1From?: number;
  stackByMupltipleFields1Sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  additionalStatsAggregationsFields1: Array<CardinalitySubAggregation | TermsSubAggregation>;
}): OptionalSubAggregation | {} =>
  stackByMupltipleFields1 != null && !isEmpty(stackByMupltipleFields1)
    ? {
        stackByMupltipleFields1: {
          multi_terms: {
            terms: stackByMupltipleFields1.map((stackByMupltipleField1) => ({
              field: stackByMupltipleField1,
            })),
          },
          aggs: {
            bucket_truncate: {
              bucket_sort: {
                sort: stackByMupltipleFields1Sort,
                from: stackByMupltipleFields1From,
                size: stackByMupltipleFields1Size,
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

export const getGroupingQuery = ({
  additionalFilters = [],
  additionalAggregationsRoot,
  additionalStatsAggregationsFields0,
  additionalStatsAggregationsFields1,
  from,
  runtimeMappings,
  stackByMupltipleFields0,
  stackByMupltipleFields0Size = DEFAULT_STACK_BY_FIELD0_SIZE,
  stackByMupltipleFields0From,
  stackByMupltipleFields0Sort,
  stackByMupltipleFields1,
  stackByMupltipleFields1Size = DEFAULT_STACK_BY_FIELD1_SIZE,
  stackByMupltipleFields1From,
  stackByMupltipleFields1Sort,
  to,
}: {
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>;
  from: string;
  runtimeMappings?: MappingRuntimeFields;
  additionalAggregationsRoot?: Array<CardinalitySubAggregation | TermsSubAggregation>;
  stackByMupltipleFields0: string[];
  stackByMupltipleFields0Size?: number;
  stackByMupltipleFields0From?: number;
  stackByMupltipleFields0Sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  additionalStatsAggregationsFields0: Array<CardinalitySubAggregation | TermsSubAggregation>;
  stackByMupltipleFields1: string[] | undefined;
  stackByMupltipleFields1Size?: number;
  stackByMupltipleFields1From?: number;
  stackByMupltipleFields1Sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  additionalStatsAggregationsFields1: Array<CardinalitySubAggregation | TermsSubAggregation>;
  to: string;
}) => ({
  size: 0,
  aggs: {
    stackByMupltipleFields0: {
      ...(stackByMupltipleFields0.length > 1
        ? {
            multi_terms: {
              terms: stackByMupltipleFields0.map((stackByMupltipleField0) => ({
                field: stackByMupltipleField0,
              })),
            },
          }
        : {
            terms: {
              field: stackByMupltipleFields0[0],
              size: 10000,
            },
          }),
      aggs: {
        ...getOptionalSubAggregation({
          stackByMupltipleFields1,
          stackByMupltipleFields1Size,
          stackByMupltipleFields1From,
          stackByMupltipleFields1Sort,
          additionalStatsAggregationsFields1,
        }),
        bucket_truncate: {
          bucket_sort: {
            sort: stackByMupltipleFields0Sort,
            from: stackByMupltipleFields0From,
            size: stackByMupltipleFields0Size,
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
