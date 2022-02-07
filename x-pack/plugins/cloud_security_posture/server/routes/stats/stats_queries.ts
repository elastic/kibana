/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SearchRequest,
  CountRequest,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';

export const getFindingsEsQuery = (
  cycleId: string,
  evaluationResult?: string,
  benchmark?: string
): CountRequest => {
  const filter: QueryDslQueryContainer[] = [{ term: { 'cycle_id.keyword': cycleId } }];

  if (benchmark) {
    filter.push({ term: { 'rule.benchmark.keyword': benchmark } });
  }

  if (evaluationResult) {
    filter.push({ term: { 'result.evaluation.keyword': evaluationResult } });
  }

  return {
    index: CSP_KUBEBEAT_INDEX_PATTERN,
    query: {
      bool: { filter },
    },
  };
};

export const getResourcesEvaluationEsQuery = (
  cycleId: string,
  result: 'passed' | 'failed',
  size: number,
  resources?: string[]
): SearchRequest => {
  const query: QueryDslQueryContainer = {
    bool: {
      filter: [
        { term: { 'cycle_id.keyword': cycleId } },
        { term: { 'result.evaluation.keyword': result } },
      ],
    },
  };
  if (resources) {
    query.bool!.must = { terms: { 'resource.filename.keyword': resources } };
  }
  return {
    index: CSP_KUBEBEAT_INDEX_PATTERN,
    size,
    query,
    aggs: {
      group: {
        terms: { field: 'resource.filename.keyword' },
      },
    },
    sort: 'resource.filename.keyword',
  };
};

export const getBenchmarksQuery = (): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  size: 0,
  aggs: {
    benchmarks: {
      terms: { field: 'rule.benchmark.keyword' },
    },
  },
});

export const getLatestFindingQuery = (): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  size: 1,
  /* @ts-expect-error TS2322 - missing SearchSortContainer */
  sort: { '@timestamp': 'desc' },
  query: {
    match_all: {},
  },
});
