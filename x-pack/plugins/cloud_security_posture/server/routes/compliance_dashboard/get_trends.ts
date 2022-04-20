/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { BENCHMARK_SCORE_INDEX_PATTERN } from '../../../common/constants';
import { Stats } from '../../../common/types';
import { calculatePostureScore } from './get_stats';

export interface ScoreTrendDoc {
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

export const getTrendsQuery = () => ({
  index: BENCHMARK_SCORE_INDEX_PATTERN,
  size: 5,
  sort: '@timestamp:desc',
});

export type Trends = Array<{
  timestamp: string;
  summary: Stats;
  clusters: Record<string, Stats>;
}>;

export const getTrendsFromQueryResult = (scoreTrendDocs: ScoreTrendDoc[]): Trends =>
  scoreTrendDocs.map((data) => ({
    timestamp: data['@timestamp'],
    summary: {
      totalFindings: data.total_findings,
      totalFailed: data.failed_findings,
      totalPassed: data.passed_findings,
      postureScore: calculatePostureScore(data.passed_findings, data.failed_findings),
    },
    clusters: Object.fromEntries(
      Object.entries(data.score_by_cluster_id).map(([clusterId, cluster]) => [
        clusterId,
        {
          totalFindings: cluster.total_findings,
          totalFailed: cluster.failed_findings,
          totalPassed: cluster.passed_findings,
          postureScore: calculatePostureScore(cluster.passed_findings, cluster.failed_findings),
        },
      ])
    ),
  }));

export const getTrends = async (esClient: ElasticsearchClient): Promise<Trends> => {
  const trendsQueryResult = await esClient.search<ScoreTrendDoc>(getTrendsQuery());

  if (!trendsQueryResult.hits.hits) throw new Error('missing trend results from score index');

  const scoreTrendDocs = trendsQueryResult.hits.hits.map((hit) => {
    if (!hit._source) throw new Error('missing _source data for one or more of trend results');
    return hit._source;
  });

  return getTrendsFromQueryResult(scoreTrendDocs);
};
