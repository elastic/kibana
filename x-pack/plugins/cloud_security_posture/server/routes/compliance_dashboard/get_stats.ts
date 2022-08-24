/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ComplianceDashboardData, Score } from '../../../common/types';

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

export const calculatePostureScore = (passed: number, failed: number): Score =>
  roundScore(passed / (passed + failed));

export interface FindingsEvaluationsQueryResult {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
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

export const getEvaluationsQuery = (
  query: QueryDslQueryContainer,
  pitId: string
): SearchRequest => ({
  query,
  size: 0,
  aggs: findingsEvaluationAggsQuery,
  pit: {
    id: pitId,
  },
});

export const getStatsFromFindingsEvaluationsAggs = (
  findingsEvaluationsAggs: FindingsEvaluationsQueryResult
): ComplianceDashboardData['stats'] => {
  const failedFindings = findingsEvaluationsAggs.failed_findings.doc_count || 0;
  const passedFindings = findingsEvaluationsAggs.passed_findings.doc_count || 0;
  const totalFindings = failedFindings + passedFindings;
  if (!totalFindings) throw new Error("couldn't calculate posture score");
  const postureScore = calculatePostureScore(passedFindings, failedFindings);

  return {
    totalFailed: failedFindings,
    totalPassed: passedFindings,
    totalFindings,
    postureScore,
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
