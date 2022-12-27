/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { CspmAccountsStats, CspmResourcesStats } from './types';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';
import { calculatePostureScore } from '@kbn/cloud-security-posture-plugin/server/routes/compliance_dashboard/get_stats';

interface AccountsStats {
  accounts: {
    buckets: AccountEntity[];
  };
}

export interface AccountEntity {
  key: string; // account_id

  doc_count: number; // latest findings doc count

  nodes_count: {
    value: number;
  };

  resources: {
    pods_count: {
      value: number;
    };
  };

  agents_count: {
    value: number;
  };

  passed_findings_count: {
    doc_count: number;
  };

  failed_findings_count: {
    doc_count: number;
  };

  benchmark_name: { top: BenchmarkName[] };

  benchmark_id: { top: BenchmarkId[] };

  benchmark_version: { top: BenchmarkVersion[] };
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

const getAccountsStatsQuery = (index: string): SearchRequest => ({
  index,
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'cluster_id',
        order: {
          _count: 'desc',
        },
        size: 100,
      },
      aggs: {
        nodes_count: {
          cardinality: {
            field: 'host.name',
          },
        },
        agents_count: {
          cardinality: {
            field: 'agent.id',
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

        resources: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'resource.sub_type': 'Pod',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          aggs: {
            pods_count: {
              cardinality: {
                field: 'resource.id',
              },
            },
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const getCspmAccountsStats = (aggregatedResourcesStats: AccountsStats): CspmAccountsStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const accountsStats = accounts.map((account) => {
    const nodesCount = account.nodes_count.value;
    const agentsCount = account.agents_count.value;
    const passedFindingsCount = account.passed_findings_count.doc_count;
    const failedFindingsCount = account.failed_findings_count.doc_count;
    const benchmarkName = account.benchmark_name.top[0].metrics['rule.benchmark.name'];
    const benchmarkId = account.benchmark_id.top[0].metrics['rule.benchmark.id'];
    const benchmarkVersion = account.benchmark_version.top[0].metrics['rule.benchmark.version'];
    const podsCount = account.resources.pods_count.value;
    const latestFindingsDocsCount = account.doc_count;
    return {
      account_id: account.key,
      posture_score: calculatePostureScore(passedFindingsCount, failedFindingsCount),
      passed_findings_count: passedFindingsCount,
      failed_findings_count: failedFindingsCount,
      latest_findings_doc_count: latestFindingsDocsCount,
      agents_count: agentsCount,
      nodes_count: nodesCount,
      pods_count: podsCount,
      benchmark_name: benchmarkName,
      benchmark_id: benchmarkId,
      benchmark_version: benchmarkVersion,
    };
  });

  console.log({ accountsStats });

  return accountsStats;
};

export const getAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CspmAccountsStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    if (isIndexExists) {
      const accountsStatsResponse = await esClient.search<unknown, AccountsStats>(
        getAccountsStatsQuery(LATEST_FINDINGS_INDEX_DEFAULT_NS)
      );

      const cspmAccountsStats = accountsStatsResponse.aggregations
        ? getCspmAccountsStats(accountsStatsResponse.aggregations)
        : [];

      return cspmAccountsStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get resources stats ${e}`);
    return [];
  }
};
