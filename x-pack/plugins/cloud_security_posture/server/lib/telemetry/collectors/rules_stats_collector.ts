/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type {
  AggregationsMultiBucketBase,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { CspmRulesStats } from './types';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';

interface BenchmarkName {
  metrics: { 'rule.benchmark.name': string };
}

interface BenchmarkId {
  metrics: { 'rule.benchmark.id': string };
}

interface BenchmarkVersion {
  metrics: { 'rule.benchmark.version': string };
}
interface RuleName {
  metrics: { 'rule.name': string };
}
interface RuleSection {
  metrics: { 'rule.section': string };
}
interface RuleVersion {
  metrics: { 'rule.version': string };
}
interface RuleNumber {
  metrics: { 'rule.benchmark.rule_number': string };
}
interface PostureType {
  metrics: { 'rule.benchmark.posture_type': string };
}

interface RulesStats {
  rules: {
    buckets: RuleEntity[];
  };
}

interface RuleEntity {
  key: string; // rule_id
  rule_name: { top: RuleName[] };
  rule_section: { top: RuleSection[] };
  rule_version: { top: RuleVersion[] };
  rule_number: { top: RuleNumber[] };
  posture_type: { top: PostureType[] };
  benchmark_id: { top: BenchmarkId[] };
  benchmark_name: { top: BenchmarkName[] };
  benchmark_version: { top: BenchmarkVersion[] };
  passed_findings_count: AggregationsMultiBucketBase;
  failed_findings_count: AggregationsMultiBucketBase;
}

const getRulesStatsQuery = (): SearchRequest => ({
  index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
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
        rule_name: {
          top_metrics: {
            metrics: {
              field: 'rule.name',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        rule_section: {
          top_metrics: {
            metrics: {
              field: 'rule.section',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        rule_version: {
          top_metrics: {
            metrics: {
              field: 'rule.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        posture_type: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.posture_type',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        rule_number: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.rule_number',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
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
    rule_name: rule.rule_name.top[0].metrics['rule.name'],
    rule_section: rule.rule_section.top[0].metrics['rule.section'],
    rule_version: rule.rule_version.top[0].metrics['rule.version'],
    rule_number: rule.rule_number.top[0].metrics['rule.benchmark.rule_number'],
    posture_type: rule.posture_type.top[0].metrics['rule.benchmark.posture_type'],
    benchmark_name: rule.benchmark_name.top[0].metrics['rule.benchmark.name'],
    benchmark_id: rule.benchmark_id.top[0].metrics['rule.benchmark.id'],
    passed_findings_count: rule.passed_findings_count.doc_count,
    benchmark_version: rule.benchmark_version.top[0].metrics['rule.benchmark.version'],
    failed_findings_count: rule.failed_findings_count.doc_count,
  }));

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
      const rulesStatsResponse = await esClient.search<unknown, RulesStats>(getRulesStatsQuery());

      const cspmRulesStats = rulesStatsResponse.aggregations
        ? getCspmRulesStats(rulesStatsResponse.aggregations, logger)
        : [];

      return cspmRulesStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get rules stats ${e}`);
    return [];
  }
};
