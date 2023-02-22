/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { BoolQuery } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface BoolAgg {
  bool: BoolQuery;
}

interface RangeAgg {
  range: { '@timestamp': { gte: string; lte: string } };
}

export interface BucketTruncateAgg {
  bucket_truncate: { bucket_sort: estypes.AggregationsAggregationContainer['bucket_sort'] };
}
export interface OptionalSubAggregation {
  stackByMultipleFields1: {
    multi_terms: estypes.AggregationsAggregationContainer['multi_terms'];
    aggs: NonNullable<BucketTruncateAgg> | CardinalitySubAggregation | TermsSubAggregation;
  };
}

export interface CardinalitySubAggregation {
  [category: string]: { cardinality: estypes.AggregationsAggregationContainer['cardinality'] };
}

export interface TermsSubAggregation {
  [category: string]: { terms: estypes.AggregationsAggregationContainer['terms'] };
}

export interface GroupingQueryArgs {
  additionalFilters: BoolAgg[];
  from: string;
  runtimeMappings?: MappingRuntimeFields;
  additionalAggregationsRoot?: Array<CardinalitySubAggregation | TermsSubAggregation>;
  stackByMultipleFields0: string[];
  stackByMultipleFields0Size?: number;
  stackByMultipleFields0From?: number;
  stackByMultipleFields0Sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  additionalStatsAggregationsFields0: Array<CardinalitySubAggregation | TermsSubAggregation>;
  stackByMultipleFields1: string[] | undefined;
  stackByMultipleFields1Size?: number;
  stackByMultipleFields1From?: number;
  stackByMultipleFields1Sort?: Array<{ [category: string]: { order: estypes.SortOrder } }>;
  additionalStatsAggregationsFields1: Array<CardinalitySubAggregation | TermsSubAggregation>;
  to: string;
}

/** Defines the shape of query sent to Elasticsearch */
// TODO: Fix this type, having trouble with aggs.stackByMultipleFields0.aggs
export interface GroupingQuery {
  size: number;
  runtime_mappings: MappingRuntimeFields | undefined;
  query: {
    bool: {
      filter: Array<BoolAgg | RangeAgg>;
    };
  };
  _source: boolean;
  aggs: NonNullable<{
    stackByMultipleFields0: {
      terms?: estypes.AggregationsAggregationContainer['terms'];
      multi_terms?: estypes.AggregationsAggregationContainer['multi_terms'];
      // TODO: this is the troublesome param
      aggs: BucketTruncateAgg &
        (OptionalSubAggregation | CardinalitySubAggregation | TermsSubAggregation);
    };
  }> &
    (CardinalitySubAggregation | TermsSubAggregation);
}
