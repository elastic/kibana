/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  AggregationsMultiBucketAggregateBase as Aggregation,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { calculatePostureScore } from './get_stats';
import type { ComplianceDashboardData } from '../../../common/types';
import { KeyDocCount } from './compliance_dashboard';

export interface FailedFindingsQueryResult {
  aggs_by_resource_type: Aggregation<FailedFindingsBucket>;
}

export interface FailedFindingsBucket extends KeyDocCount {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  score: { value: number };
}

export const failedFindingsAggQuery = {
  aggs_by_resource_type: {
    terms: {
      field: 'rule.section',
      size: 5,
    },
    aggs: {
      failed_findings: {
        filter: { term: { 'result.evaluation': 'failed' } },
      },
      passed_findings: {
        filter: { term: { 'result.evaluation': 'passed' } },
      },
      score: {
        bucket_script: {
          buckets_path: {
            passed: 'passed_findings>_count',
            failed: 'failed_findings>_count',
          },
          script: 'params.passed / (params.passed + params.failed)',
        },
      },
      sort_by_score: {
        bucket_sort: {
          sort: {
            score: 'asc' as 'asc',
          },
        },
      },
    },
  },
};

export const getRisksEsQuery = (query: QueryDslQueryContainer, pitId: string): SearchRequest => ({
  size: 0,
  query,
  aggs: failedFindingsAggQuery,
  pit: {
    id: pitId,
  },
});

export const getFailedFindingsFromAggs = (
  queryResult: FailedFindingsBucket[]
): ComplianceDashboardData['groupedFindingsEvaluation'] =>
  queryResult.map((bucket) => {
    const totalPassed = bucket.passed_findings.doc_count || 0;
    const totalFailed = bucket.failed_findings.doc_count || 0;

    return {
      name: bucket.key,
      totalFindings: bucket.doc_count,
      totalFailed,
      totalPassed,
      postureScore: calculatePostureScore(totalPassed, totalFailed),
    };
  });

export const getGroupedFindingsEvaluation = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pitId: string
): Promise<ComplianceDashboardData['groupedFindingsEvaluation']> => {
  const resourceTypesQueryResult = await esClient.search<unknown, FailedFindingsQueryResult>(
    getRisksEsQuery(query, pitId)
  );

  const ruleSections = resourceTypesQueryResult.aggregations?.aggs_by_resource_type.buckets;
  if (!Array.isArray(ruleSections)) {
    return [];
  }

  return getFailedFindingsFromAggs(ruleSections);
};
