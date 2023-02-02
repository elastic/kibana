/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { CspmRulesStats } from './types';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';

interface DocCount {
  doc_count: number;
}

interface BenchmarkName {
  metrics: { 'rule.benchmark.name': string };
}

interface BenchmarkId {
  metrics: { 'rule.benchmark.id': string };
}

interface BenchmarkVersion {
  metrics: { 'rule.benchmark.version': string };
}

interface RulesStats {
  rules: {
    buckets: RuleEntity[];
  };
}
interface RuleEntity {
  key: string; // rule_id
  passed_findings_count: DocCount;
  failed_findings_count: DocCount;
  benchmark_name: { top: BenchmarkName[] };
  benchmark_id: { top: BenchmarkId[] };
  benchmark_version: { top: BenchmarkVersion[] };
}

const getRulesStatsQuery = (index: string): SearchRequest => ({
  index,
  query: {
    match_all: {},
  },
  aggs: {
    rules: {
      terms: {
        field: 'rule.id',
        order: {
          _count: 'desc',
        },
        size: 100,
      },
      aggs: {
        benchmark_id: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.id',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        benchmark_version: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        benchmark_name: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.name',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        passed_findings_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'result.evaluation': 'passed',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        failed_findings_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'result.evaluation': 'failed',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const getCspmRulesStats = (aggregatedRulesStats: RulesStats, logger: Logger): CspmRulesStats[] => {
  const rules = aggregatedRulesStats.rules.buckets;

  const cspmRulesStats = rules.map((rule) => ({
    rule_id: rule.key,
    benchmark_name: rule.benchmark_name.top[0].metrics['rule.benchmark.name'],
    benchmark_id: rule.benchmark_id.top[0].metrics['rule.benchmark.id'],
    passed_findings_count: rule.passed_findings_count.doc_count,
    benchmark_version: rule.benchmark_version.top[0].metrics['rule.benchmark.version'],
    failed_findings_count: rule.failed_findings_count.doc_count,
  }));

  console.log({ cspmRulesStats });
  logger.info('CSPM telemetry: rules stats was sent');

  return cspmRulesStats;
};

export const getRulesStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CspmRulesStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    if (isIndexExists) {
      const rulesStatsResponse = await esClient.search<unknown, RulesStats>(
        getRulesStatsQuery(LATEST_FINDINGS_INDEX_DEFAULT_NS)
      );

      console.log({ rulesStatsResponse });

      const cspmRulesStats = rulesStatsResponse.aggregations
        ? getCspmRulesStats(rulesStatsResponse.aggregations, logger)
        : [];

      return cspmRulesStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get resources stats ${e}`);
    return [];
  }
};
