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
import { getSafeCspmCloudAccountIdRuntimeMapping } from '../../../../common/runtime_mappings/get_cloud_account_id_mapping';
import { getIdentifierRuntimeMapping } from '../../../../common/runtime_mappings/get_identifier_runtime_mapping';
import { calculatePostureScore } from '../../../../common/utils/helpers';
import type { CloudAccountsStats } from './types';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
} from '../../../../common/constants';

interface Value {
  value: number;
}
interface BenchmarkName {
  metrics: { 'rule.benchmark.name': string };
}

interface BenchmarkVersion {
  metrics: { 'rule.benchmark.version': string };
}

interface BenchmarkPostureType {
  metrics: { 'rule.benchmark.postureType': string };
}

interface CloudProvider {
  metrics: { 'cloud.provider': string };
}
interface KubernetesVersion {
  metrics: { 'cloudbeat.kubernetes.version': string };
}

interface PackagePolicyId {
  metrics: { 'cloud_security_posture.package_policy_id': string };
}

interface LatestDocTimestamp {
  metrics: { '@timestamp': string };
}

interface AccountsStats {
  accounts: {
    buckets: AccountEntity[];
  };
}
interface AccountEntity {
  key: string; // account_id
  doc_count: number; // latest findings doc count
  passed_findings_count: AggregationsMultiBucketBase;
  failed_findings_count: AggregationsMultiBucketBase;
  package_policy_id: { top: PackagePolicyId[] };
  cloud_provider: { top: CloudProvider[] };
  latest_doc_updated_timestamp: { top: LatestDocTimestamp[] };
  benchmark_posture_type: { top: BenchmarkPostureType[] };
  benchmark_name: { top: BenchmarkName[] };
  benchmark_version: { top: BenchmarkVersion[] };
  kubernetes_version: { top: KubernetesVersion[] };
  agents_count: Value;
  nodes_count: Value;
  pods_count: Value;
  resources: {
    pods_count: Value;
  };
}

const getPostureAccountsStatsQuery = (index: string): SearchRequest => ({
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
        cloud_provider: {
          top_metrics: {
            metrics: {
              field: 'cloud.provider',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        latest_doc_updated_timestamp: {
          top_metrics: {
            metrics: {
              field: '@timestamp',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        benchmark_posture_type: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.postureType',
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

        // KSPM QUERY FIELDS
        kubernetes_version: {
          top_metrics: {
            metrics: {
              field: 'cloudbeat.kubernetes.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
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
      },
    },
  },

  size: 0,
  _source: false,
});

const getVulnMgmtAccountsStatsQuery = (index: string): SearchRequest => ({
  index,
  runtime_mappings: getSafeCspmCloudAccountIdRuntimeMapping(),
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
        cloud_provider: {
          top_metrics: {
            metrics: {
              field: 'cloud.provider',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        latest_doc_updated_timestamp: {
          top_metrics: {
            metrics: {
              field: '@timestamp',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const cloudBaseStats = (account: AccountEntity, product: string) => ({
  account_id: account.key,
  latest_doc_count: account.doc_count,
  latest_doc_updated_timestamp: account.latest_doc_updated_timestamp.top[0].metrics['@timestamp'],
  product,
  cloud_provider: account.cloud_provider.top[0].metrics['cloud.provider'],
  package_policy_id: 'packagePolicyID',
});

const cloudPostureStats = (account: AccountEntity) => ({
  cloud_posture_stats: {
    posture_score: calculatePostureScore(
      account.passed_findings_count.doc_count,
      account.failed_findings_count.doc_count
    ),
    passed_findings_count: account.passed_findings_count.doc_count,
    failed_findings_count: account.failed_findings_count.doc_count,
    benchmark_name: account.benchmark_name.top[0].metrics['rule.benchmark.name'],
    benchmark_version: account.benchmark_version.top[0].metrics['rule.benchmark.version'],
  },
});

const kspmStats = (account: AccountEntity) => ({
  kspm_stats: {
    kubernetes_version: account.kubernetes_version.top[0].metrics['cloudbeat.kubernetes.version'],
    agents_count: account.agents_count.value,
    nodes_count: account.nodes_count.value,
    pods_count: account.resources.pods_count.value,
  },
});

const getCloudPostureAccountsStats = (
  aggregatedResourcesStats: AccountsStats,
  logger: Logger
): CloudAccountsStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const cloudPostureAccountsStats = accounts.map((account) => {
    const postureType = account.benchmark_posture_type.top[0].metrics['rule.benchmark.postureType'];
    if (postureType === CSPM_POLICY_TEMPLATE) {
      return {
        ...cloudBaseStats(account, CSPM_POLICY_TEMPLATE),
        ...cloudPostureStats(account),
      };
    }

    return {
      ...cloudBaseStats(account, KSPM_POLICY_TEMPLATE),
      ...cloudPostureStats(account),
      ...kspmStats(account),
    };
  });

  logger.info('Cloud Posture telemetry: accounts stats was sent');

  return cloudPostureAccountsStats;
};

const indexAccountStats = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  index: string,
  getAccountQuery: (index: string) => SearchRequest
) => {
  const accountsStatsResponse = await esClient.search<unknown, AccountsStats>(
    getAccountQuery(index)
  );

  return accountsStatsResponse.aggregations
    ? getCloudPostureAccountsStats(accountsStatsResponse.aggregations, logger)
    : [];
};

export const getCloudAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CloudAccountsStats[]> => {
  try {
    const indices = [LATEST_FINDINGS_INDEX_DEFAULT_NS, LATEST_VULNERABILITIES_INDEX_DEFAULT_NS];
    const [findingIndex, vulnerabilitiesIndex] = await Promise.all(
      indices.map(async (index) => ({
        exists: await esClient.indices.exists({
          index,
        }),
        name: index,
      }))
    );

    let postureIndexAccountStats: CloudAccountsStats[] = [];
    let vulnerabilityIndexAccountStats: CloudAccountsStats[] = [];

    if (!findingIndex.exists && !vulnerabilitiesIndex.exists) return [];
    if (findingIndex.exists) {
      postureIndexAccountStats = await indexAccountStats(
        esClient,
        logger,
        findingIndex.name,
        getPostureAccountsStatsQuery
      );
    }

    if (vulnerabilitiesIndex.exists) {
      vulnerabilityIndexAccountStats = await indexAccountStats(
        esClient,
        logger,
        vulnerabilitiesIndex.name,
        getVulnMgmtAccountsStatsQuery
      );
    }

    return [...postureIndexAccountStats, ...vulnerabilityIndexAccountStats];
  } catch (e) {
    logger.error(`Failed to get cloud account stats v2 ${e}`);
    return [];
  }
};
