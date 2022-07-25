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
}

export const failedFindingsAggQuery = {
  aggs_by_resource_type: {
    terms: {
      field: 'rule.section.keyword',
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
  queryResult.map((bucket) => ({
    name: bucket.key,
    totalFindings: bucket.doc_count,
    totalFailed: bucket.failed_findings.doc_count || 0,
    totalPassed: bucket.passed_findings.doc_count || 0,
  }));

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
