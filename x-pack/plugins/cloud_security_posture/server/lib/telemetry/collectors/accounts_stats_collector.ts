/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { MappingRuntimeFields, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { calculatePostureScore } from '../../../../common/utils/helpers';
import type { CspmAccountsStats } from './types';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';

interface Value {
  value: number;
}

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

interface AccountsStats {
  accounts: {
    buckets: AccountEntity[];
  };
}
interface AccountEntity {
  key: string; // account_id
  doc_count: number; // latest findings doc count
  passed_findings_count: DocCount;
  failed_findings_count: DocCount;
  benchmark_name: { top: BenchmarkName[] };
  benchmark_id: { top: BenchmarkId[] };
  benchmark_version: { top: BenchmarkVersion[] };
  agents_count: Value;
  nodes_count: Value;
  pods_count: Value;
  resources: {
    pods_count: Value;
  };
}

export const getIdentifierRuntimeMapping = (): MappingRuntimeFields => ({
  asset_identifier: {
    type: 'keyword',
    script: {
      source: `
        if (!doc.containsKey('rule.benchmark.posture_type')) 
          {
            def identifier = doc["cluster_id"].value;
            emit(identifier);
            return
          }
        else
        {
          if(doc["rule.benchmark.posture_type"].size() > 0)
            {
              def policy_template_type = doc["rule.benchmark.posture_type"].value; 
              if (policy_template_type == "cspm")
              {
                def identifier = doc["cloud.account.id"].value;
                emit(identifier);
                return
              }
      
              if (policy_template_type == "kspm")
              {
                def identifier = doc["cluster_id"].value;
                emit(identifier);
                return
              }
            }
            
            def identifier = doc["cluster_id"].value;
            emit(identifier);
            return
        }
      `,
    },
  },
});

const getAccountsStatsQuery = (index: string): SearchRequest => ({
  index,
  runtime_mappings: getIdentifierRuntimeMapping(),
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'asset_identifier',
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

const getCspmAccountsStats = (
  aggregatedResourcesStats: AccountsStats,
  logger: Logger
): CspmAccountsStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const cspmAccountsStats = accounts.map((account) => ({
    account_id: account.key,
    latest_findings_doc_count: account.doc_count,
    posture_score: calculatePostureScore(
      account.passed_findings_count.doc_count,
      account.failed_findings_count.doc_count
    ),
    passed_findings_count: account.passed_findings_count.doc_count,
    failed_findings_count: account.failed_findings_count.doc_count,
    benchmark_name: account.benchmark_name.top[0].metrics['rule.benchmark.name'],
    benchmark_id: account.benchmark_id.top[0].metrics['rule.benchmark.id'],
    benchmark_version: account.benchmark_version.top[0].metrics['rule.benchmark.version'],
    agents_count: account.agents_count.value,
    nodes_count: account.nodes_count.value,
    pods_count: account.resources.pods_count.value,
  }));
  logger.info('CSPM telemetry: accounts stats was sent');

  return cspmAccountsStats;
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
        ? getCspmAccountsStats(accountsStatsResponse.aggregations, logger)
        : [];

      return cspmAccountsStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get resources stats ${e}`);
    return [];
  }
};
