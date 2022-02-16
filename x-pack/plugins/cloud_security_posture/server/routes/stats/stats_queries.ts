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
import { Evaluation } from '../../../common/types';

export const getFindingsEsQuery = (
  cycleId: string,
  evaluationResult?: string,
  benchmark?: string
): CountRequest => {
  // const filter: QueryDslQueryContainer[] = [{ term: { 'cycle_id.keyword': cycleId } }];
  const filter: QueryDslQueryContainer[] = [];

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

export const getRisksEsQuery = (cycleId: string): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  size: 0,
  query: {
    match_all: {},
    // bool: {
    //   filter: [{ term: { 'cycle_id.keyword': cycleId } }],
    // },
  },
  aggs: {
    aggs_by_resource_type: {
      terms: {
        field: 'resource.type.keyword',
      },
      aggs: {
        failed_findings: {
          filter: { term: { 'result.evaluation.keyword': 'failed' } },
        },
        passed_findings: {
          filter: { term: { 'result.evaluation.keyword': 'passed' } },
        },
      },
    },
  },
});

export const getClustersQuery = (cycleId: string): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  size: 0,
  query: {
    match_all: {},
    // bool: {
    //   filter: [{ term: { 'cycle_id.keyword': cycleId } }],
    // },
  },
  aggs: {
    aggs_by_cluster_id: {
      terms: {
        field: 'cluster_id.keyword',
      },
      aggs: {
        failed_findings: {
          filter: { term: { 'result.evaluation.keyword': 'failed' } },
        },
        passed_findings: {
          filter: { term: { 'result.evaluation.keyword': 'passed' } },
        },
        benchmark: {
          terms: {
            field: 'rule.benchmark.keyword',
          },
        },
        aggs_by_resource_type: {
          terms: {
            field: 'resource.type.keyword',
          },
          aggs: {
            failed_findings: {
              filter: { term: { 'result.evaluation.keyword': 'failed' } },
            },
            passed_findings: {
              filter: { term: { 'result.evaluation.keyword': 'passed' } },
            },
          },
        },
      },
    },
  },
});
