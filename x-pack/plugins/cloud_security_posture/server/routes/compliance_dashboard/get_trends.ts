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

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

export const calculatePostureScore = (passed: number, failed: number): Score =>
  roundScore(passed / (passed + failed));

export type TrendsESQueryResult = SearchResponseBody<{
  _source: {
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
  };
}>;

export const getTrendsAggsQuery = () => ({
  index: BENCHMARK_SCORE_INDEX_PATTERN,
  size: 5,
  sort: [
    {
      '@timestamp': {
        order: 'desc',
      },
    },
  ],
});

export const getTrends = async (
  esClient: ElasticsearchClient
): Promise<ComplianceDashboardData['trend']> => {
  const trendQueryResult = await esClient.search<unknown, TrendsESQueryResult>(
    // @ts-ignore
    getTrendsAggsQuery(),
    { meta: true }
  );


  return getTrendsFromTrendAggs(trendAggs);
};
