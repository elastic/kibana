/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { calculatePostureScore } from '../../../common/utils/helpers';
import type { ComplianceDashboardData, Score } from '../../../common/types';

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

export interface FindingsEvaluationsQueryResult {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  resources_evaluated?: {
    value: number;
  };
}

export const findingsEvaluationAggsQuery = {
  failed_findings: {
    filter: { term: { 'result.evaluation': 'failed' } },
  },
  passed_findings: {
    filter: { term: { 'result.evaluation': 'passed' } },
  },
};

const uniqueResourcesCountQuery = {
  resources_evaluated: {
    cardinality: {
      field: 'resource.id',
    },
  },
};

export const getEvaluationsQuery = (
  query: QueryDslQueryContainer,
  pitId: string
): SearchRequest => ({
  query,
  size: 0,
  aggs: {
    ...findingsEvaluationAggsQuery,
    ...uniqueResourcesCountQuery,
  },
  pit: {
    id: pitId,
  },
});

export const getStatsFromFindingsEvaluationsAggs = (
  findingsEvaluationsAggs: FindingsEvaluationsQueryResult
): ComplianceDashboardData['stats'] => {
  const resourcesEvaluated = findingsEvaluationsAggs.resources_evaluated?.value;
  const failedFindings = findingsEvaluationsAggs.failed_findings.doc_count || 0;
  const passedFindings = findingsEvaluationsAggs.passed_findings.doc_count || 0;
  const totalFindings = failedFindings + passedFindings;
  const postureScore = calculatePostureScore(passedFindings, failedFindings) || 0;

  return {
    totalFailed: failedFindings,
    totalPassed: passedFindings,
    totalFindings,
    postureScore,
    ...(resourcesEvaluated && { resourcesEvaluated }),
  };
};

export const getStats = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pitId: string
): Promise<ComplianceDashboardData['stats']> => {
  const evaluationsQueryResult = await esClient.search<unknown, FindingsEvaluationsQueryResult>(
    getEvaluationsQuery(query, pitId)
  );

  const findingsEvaluations = evaluationsQueryResult.aggregations;
  if (!findingsEvaluations) throw new Error('missing findings evaluations');

  return getStatsFromFindingsEvaluationsAggs(findingsEvaluations);
};
