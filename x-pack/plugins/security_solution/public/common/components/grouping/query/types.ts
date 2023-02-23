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

export interface TermsOrCardinalityAggregation {
  [category: string]:
    | {
        cardinality: estypes.AggregationsAggregationContainer['cardinality'];
      }
    | {
        terms: estypes.AggregationsAggregationContainer['terms'];
      };
}

export interface GroupingQueryArgs {
  additionalFilters: BoolAgg[];
  from: string;
  runtimeMappings?: MappingRuntimeFields;
  additionalAggregationsRoot?: TermsOrCardinalityAggregation[];
  stackByMultipleFields0: string[];
  stackByMultipleFields0Size?: number;
  stackByMultipleFields0From?: number;
  stackByMultipleFields0Sort?: Array<{ [category: string]: { order: 'asc' | 'desc' } }>;
  additionalStatsAggregationsFields0: TermsOrCardinalityAggregation[];
  stackByMultipleFields1: string[] | undefined;
  stackByMultipleFields1Size?: number;
  stackByMultipleFields1From?: number;
  stackByMultipleFields1Sort?: Array<{ [category: string]: { order: estypes.SortOrder } }>;
  additionalStatsAggregationsFields1: TermsOrCardinalityAggregation[];
  to: string;
}

export interface SubAggregation extends Record<string, estypes.AggregationsAggregationContainer> {
  bucket_truncate: estypes.AggregationsAggregationContainer;
}

export interface MainAggregation extends Record<string, estypes.AggregationsAggregationContainer> {
  stackByMultipleFields0: {
    terms?: estypes.AggregationsAggregationContainer['terms'];
    multi_terms?: estypes.AggregationsAggregationContainer['multi_terms'];
    aggs: SubAggregation;
  };
}

export interface GroupingQuery extends estypes.QueryDslQueryContainer {
  size: number;
  runtime_mappings: MappingRuntimeFields | undefined;
  query: {
    bool: {
      filter: Array<BoolAgg | RangeAgg>;
    };
  };
  _source: boolean;
  aggs: MainAggregation;
}
