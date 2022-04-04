/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import { BENCHMARK_SCORE_INDEX_PATTERN } from '../../../common/constants';
import type { ComplianceDashboardData, Score } from '../../../common/types';
import { FindingsEvaluation } from '../../../common/types';

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

export const calculatePostureScore = (passed: number, failed: number): Score =>
  roundScore(passed / (passed + failed));

export interface TrendsESQueryResult {
  '@timestamp': string;
  total_findings: number;
  passed_findings: number;
  failed_findings: number;
  score_by_cluster_id: Record<
    string,
    {
      total_findings: number;
      passed_findings: number;
      failed_findings: number;
    }
  >;
}

export const getTrendsAggsQuery = () => ({
  index: BENCHMARK_SCORE_INDEX_PATTERN,
  size: 5,
  sort: {
    '@timestamp': {
      order: 'desc',
    },
  },
});

type GetTrendsResult = Array<{
  timestamp: string;
  summary: FindingsEvaluation;
  clusters: Record<string, FindingsEvaluation>;
}>;

export const getTrends = async (esClient: ElasticsearchClient): Promise<GetTrendsResult> => {
  // @ts-ignore
  const trendsQueryResult = await esClient.search<TrendsESQueryResult>(getTrendsAggsQuery(), {
    meta: true,
  });

  if (!trendsQueryResult.hits.hits) throw new Error('missing trend results from score index');

  const trends = trendsQueryResult.hits.hits.map((hit) => {
    if (!hit._source) throw new Error('missing data for one or more of the trend results');
    const data = hit._source;

    return {
      timestamp: data['@timestamp'],
      summary: {
        totalFindings: data.total_findings,
        failedFindings: data.failed_findings,
        passedFindings: data.passed_findings,
      },
      clusters: data.score_by_cluster_id,
    };
  });

  return trends;
};
