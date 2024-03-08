/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { calculatePostureScore } from '../../../common/utils/helpers';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  CSPM_FINDINGS_STATS_INTERVAL,
} from '../../../common/constants';
import type { PosturePolicyTemplate, Stats } from '../../../common/types_old';
import { toBenchmarkDocFieldKey } from '../../lib/mapping_field_util';

interface FindingsDetails {
  total_findings: number;
  passed_findings: number;
  failed_findings: number;
}

interface ScoreByClusterId {
  [clusterId: string]: FindingsDetails;
}

interface ScoreByBenchmarkId {
  [benchmarkId: string]: {
    [key: string]: FindingsDetails;
  };
}

export interface ScoreTrendDoc {
  '@timestamp': string;
  total_findings: number;
  passed_findings: number;
  failed_findings: number;
  score_by_cluster_id: ScoreByClusterId;
  score_by_benchmark_id: ScoreByBenchmarkId;
}

export type Trends = Array<{
  timestamp: string;
  summary: Stats;
  clusters: Record<string, Stats>;
  benchmarks: Record<string, Stats>;
}>;

export const getTrendsQuery = (policyTemplate: PosturePolicyTemplate) => ({
  index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  // Amount of samples of the last 24 hours (accounting that we take a sample every 5 minutes)
  size: (24 * 60) / CSPM_FINDINGS_STATS_INTERVAL,
  sort: '@timestamp:desc',
  query: {
    bool: {
      filter: [{ term: { policy_template: policyTemplate } }],
      must: [
        {
          range: {
            '@timestamp': {
              gte: 'now-1d',
              lte: 'now',
            },
          },
        },
        {
          term: { is_enabled_rules_score: true },
        },
      ],
    },
  },
});

export const formatTrends = (scoreTrendDocs: ScoreTrendDoc[]): Trends => {
  return scoreTrendDocs.map((data) => {
    return {
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
      benchmarks: data.score_by_benchmark_id
        ? Object.fromEntries(
            Object.entries(data.score_by_benchmark_id).flatMap(([benchmarkId, benchmark]) =>
              Object.entries(benchmark).map(([benchmarkVersion, benchmarkStats]) => {
                const benchmarkIdVersion = toBenchmarkDocFieldKey(benchmarkId, benchmarkVersion);
                return [
                  benchmarkIdVersion,
                  {
                    totalFindings: benchmarkStats.total_findings,
                    totalFailed: benchmarkStats.failed_findings,
                    totalPassed: benchmarkStats.passed_findings,
                    postureScore: calculatePostureScore(
                      benchmarkStats.passed_findings,
                      benchmarkStats.failed_findings
                    ),
                  },
                ];
              })
            )
          )
        : {},
    };
  });
};

export const getTrends = async (
  esClient: ElasticsearchClient,
  policyTemplate: PosturePolicyTemplate,
  logger: Logger
): Promise<Trends> => {
  try {
    const trendsQueryResult = await esClient.search<ScoreTrendDoc>(getTrendsQuery(policyTemplate));

    if (!trendsQueryResult.hits.hits) throw new Error('missing trend results from score index');

    const scoreTrendDocs = trendsQueryResult.hits.hits.map((hit) => {
      if (!hit._source) throw new Error('missing _source data for one or more of trend results');
      return hit._source;
    });

    return formatTrends(scoreTrendDocs);
  } catch (err) {
    logger.error(`Failed to fetch trendlines data ${err.message}`);
    logger.error(err);
    throw err;
  }
};
