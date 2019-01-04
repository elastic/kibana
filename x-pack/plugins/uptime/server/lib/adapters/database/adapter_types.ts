/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DatabaseAdapter {
  search(request: any, params: any): Promise<any>;
}

interface ElasticsearchMatchAllQuery {
  match_all: {};
}

interface ElasticsearchFilterTermCondition {
  term: {
    [field: string]: string;
  };
}

interface ElasticsearchFilterRangeCondition {
  range: {
    [field: string]: { gte: number; lte: number };
  };
}

type ElasticsearchFilterCondition =
  | ElasticsearchFilterTermCondition
  | ElasticsearchFilterRangeCondition;

interface ElasticsearchGreater {
  gt: number | string;
}

interface ElasticsearchGreaterEqual {
  gte: number | string;
}

interface ElasticsearchLess {
  lt: number | string;
}

interface ElasticsearchLessEqual {
  lte: number | string;
}

type ElasticsearchRangeParam = (ElasticsearchGreater | ElasticsearchGreaterEqual) &
  (ElasticsearchLess | ElasticsearchLessEqual);

interface ElasticsearchRange {
  [field: string]: ElasticsearchRangeParam;
}

interface ElasticsearchFilteredQuery {
  range?: ElasticsearchRange;
  bool?: {
    must?: ElasticsearchFilterCondition[];
    filter?: ElasticsearchFilterCondition[];
    must_not?: ElasticsearchFilterCondition[];
    should?: ElasticsearchFilterCondition[];
    minimum_should_match?: number;
    boost?: number;
  };
}

interface HasElasticsearchNestedAgg {
  aggs?: { [field: string]: ElasticsearchAggregationPredicate };
}

interface ElasticsearchDateHistogramAgg {
  date_histogram: {
    field: string;
    interval: number | string;
  };
}

interface ElasticsearchTermsAgg {
  terms: {
    field: string;
  };
}

interface ElasticsearchSortCondition {
  [field: string]: { order: 'asc' | 'desc' };
}

interface ElasticsearchTopHitsAgg {
  top_hits: {
    size: number;
    sort?: ElasticsearchSortCondition | ElasticsearchSortCondition[];
  };
}

interface ElasticsearchCompositeKey {
  [field: string]: ElasticsearchTermsAgg;
}

interface ElasticsearchCompositeAgg {
  composite: {
    sources: ElasticsearchCompositeKey[];
  };
}

interface ElasticsearchMaxAgg {
  max: {
    field: string;
  };
}

interface ElasticsearchMinAgg {
  min: {
    field: string;
  };
}

interface ElasticsearchAvgAgg {
  avg: {
    field: string;
  };
}

type ElasticsearchAggregationPredicate = HasElasticsearchNestedAgg &
  (
    | ElasticsearchTopHitsAgg
    | ElasticsearchDateHistogramAgg
    | ElasticsearchTermsAgg
    | ElasticsearchCompositeAgg
    | ElasticsearchMaxAgg
    | ElasticsearchMinAgg
    | ElasticsearchAvgAgg);

interface ElasticsearchAggregation {
  [aggName: string]: ElasticsearchAggregationPredicate;
}

interface ElasticsearchQueryBody {
  query: ElasticsearchMatchAllQuery | ElasticsearchFilteredQuery;
  aggs?: ElasticsearchAggregation;
}

export interface ElasticsearchQueryParams {
  index: string;
  body: ElasticsearchQueryBody;
}
