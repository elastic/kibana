/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { KSPM_POLICY_TEMPLATE, CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { getPackagePolicyIdRuntimeMapping } from '../../../../common/runtime_mappings/get_package_policy_id_mapping';
import { getIdentifierRuntimeMapping } from '../../../../common/runtime_mappings/get_identifier_runtime_mapping';
import { calculatePostureScore } from '../../../../common/utils/helpers';
import type {
  AccountEntity,
  AccountsStats,
  CloudProviderKey,
  CloudSecurityAccountsStats,
} from './types';
import {
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../../common/constants';
import {
  getCspBenchmarkRulesStatesHandler,
  getMutedRulesFilterQuery,
} from '../../../routes/benchmark_rules/get_states/v1';

export const getPostureAccountsStatsQuery = (index: string): SearchRequest => ({
  index,
  runtime_mappings: { ...getIdentifierRuntimeMapping(), ...getPackagePolicyIdRuntimeMapping() },
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
        package_policy_id: {
          terms: {
            field: 'package_policy_identifier',
            order: {
              _count: 'desc',
            },
            size: 100,
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

export const getVulnMgmtAccountsStatsQuery = (index: string): SearchRequest => ({
  index,
  runtime_mappings: getPackagePolicyIdRuntimeMapping(),
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'cloud.account.id',
        order: {
          _count: 'desc',
        },
        size: 100,
      },
      aggs: {
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
        package_policy_id: {
          terms: {
            field: 'package_policy_identifier',
            order: {
              _count: 'desc',
            },
            size: 100,
          },
        },
      },
    },
  },
  size: 0,
  _source: false,
});

const cloudBaseStats = (account: AccountEntity) => ({
  account_id: account.key,
  latest_doc_count: account.doc_count,
  latest_doc_updated_timestamp: account.latest_doc_updated_timestamp.top[0].metrics['@timestamp'],
  cloud_provider: account.cloud_provider.top[0].metrics['cloud.provider'],
  package_policy_id: account.package_policy_id?.buckets[0]?.key ?? null,
});

const getPostureManagementStats = (account: AccountEntity) => ({
  posture_management_stats: {
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

const getKspmStats = (account: AccountEntity) => ({
  kspm_stats: {
    kubernetes_version: account.kubernetes_version.top[0].metrics['cloudbeat.kubernetes.version'],
    agents_count: account.agents_count.value,
    nodes_count: account.nodes_count.value,
    pods_count: account.resources.pods_count.value,
  },
});

const kspmCloudProviders: Record<CloudProviderKey, string | null> = {
  cis_eks: 'aws',
  cis_gke: 'gcp',
  cis_k8s: null,
  cis_ake: 'azure',
};
const cspmBenchmarkIds = ['cis_aws', 'cis_azure', 'cis_gcp'];
const kspmBenchmarkIds = ['cis_eks', 'cis_ake', 'cis_gke', 'cis_k8s'];

const getCloudProvider = (ruleBenchmarkId: CloudProviderKey) => {
  return kspmCloudProviders[ruleBenchmarkId];
};

const getPostureType = (ruleBenchmarkId: string) => {
  if (cspmBenchmarkIds.includes(ruleBenchmarkId)) {
    return CSPM_POLICY_TEMPLATE;
  } else if (kspmBenchmarkIds.includes(ruleBenchmarkId)) {
    return KSPM_POLICY_TEMPLATE;
  }
  return undefined;
};

export const getCloudAccountsStats = (
  aggregatedResourcesStats: AccountsStats,
  logger: Logger
): CloudSecurityAccountsStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const cloudAccountsStats = accounts.map((account) => {
    const cloudAccount = cloudBaseStats(account);
    const postureType = getPostureType(
      account.benchmark_id?.top?.[0]?.metrics['rule.benchmark.id']
    );

    if (!postureType) {
      return {
        ...cloudAccount,
        product: VULN_MGMT_POLICY_TEMPLATE,
      };
    }

    if (postureType === CSPM_POLICY_TEMPLATE) {
      return {
        ...cloudAccount,
        product: CSPM_POLICY_TEMPLATE,
        ...getPostureManagementStats(account),
      };
    }

    return {
      ...cloudAccount,
      product: KSPM_POLICY_TEMPLATE,
      ...getPostureManagementStats(account),
      ...getKspmStats(account),
      cloud_provider: getCloudProvider(
        account.benchmark_id.top[0].metrics['rule.benchmark.id'] as CloudProviderKey
      ),
    };
  });

  return cloudAccountsStats;
};

const getAccountStatsBasedOnEnablesRule = async (
  esClient: ElasticsearchClient,
  encryptedSoClient: ISavedObjectsRepository,
  accountQuery: SearchRequest,
  logger: Logger
): Promise<CloudSecurityAccountsStats[]> => {
  const mutedRulesObject = await getCspBenchmarkRulesStatesHandler(encryptedSoClient);
  const benchmarksWithMutedRules = [
    ...new Set(
      Object.values(mutedRulesObject).map((item) => {
        if (item.muted === true) return item.benchmark_id;
      })
    ),
  ].filter(Boolean);

  if (benchmarksWithMutedRules.length) {
    const mutedRulesFilterQuery = await getMutedRulesFilterQuery(encryptedSoClient);

    const enabledRulesQuery = {
      ...accountQuery,
      query: {
        bool: {
          must_not: mutedRulesFilterQuery,
          must: {
            terms: {
              'rule.benchmark.id': benchmarksWithMutedRules,
            },
          },
        },
      },
    };

    const enabledRulesAccountsStatsResponse = await esClient.search<unknown, AccountsStats>(
      enabledRulesQuery
    );
    const cloudAccountsStatsForEnabledRules = enabledRulesAccountsStatsResponse.aggregations
      ? getCloudAccountsStats(enabledRulesAccountsStatsResponse.aggregations, logger)
      : [];
    return cloudAccountsStatsForEnabledRules;
  }
  return [];
};

export const getIndexAccountStats = async (
  esClient: ElasticsearchClient,
  encryptedSoClient: ISavedObjectsRepository,
  logger: Logger,
  index: string,
  getAccountQuery: (index: string) => SearchRequest
): Promise<CloudSecurityAccountsStats[]> => {
  const accountQuery = getAccountQuery(index);

  const accountsStatsResponse = await esClient.search<unknown, AccountsStats>(accountQuery);

  const cloudAccountsStats = accountsStatsResponse.aggregations
    ? getCloudAccountsStats(accountsStatsResponse.aggregations, logger)
    : [];

  if (index === LATEST_FINDINGS_INDEX_DEFAULT_NS) {
    const cloudAccountsStatsForEnabledRules = await getAccountStatsBasedOnEnablesRule(
      esClient,
      encryptedSoClient,
      accountQuery,
      logger
    );

    cloudAccountsStatsForEnabledRules.forEach((statsEnabledRule) => {
      const foundStatsIndex = cloudAccountsStats.findIndex(
        (stats) => stats.account_id === statsEnabledRule.account_id
      );
      if (foundStatsIndex !== -1) {
        // Update the object in cloudAccountsStats based on the object in cloudAccountsStatsForEnabledRules
        cloudAccountsStats[foundStatsIndex].posture_management_stats_enabled_rules =
          statsEnabledRule.posture_management_stats;
        cloudAccountsStats[foundStatsIndex].has_muted_rules = true;
      }
    });
  }
  return cloudAccountsStats;
};

export const getAllCloudAccountsStats = async (
  esClient: ElasticsearchClient,
  encryptedSoClient: ISavedObjectsRepository,
  logger: Logger
): Promise<CloudSecurityAccountsStats[]> => {
  try {
    const indices = [
      LATEST_FINDINGS_INDEX_DEFAULT_NS,
      CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
    ];
    const [findingIndex, vulnerabilitiesIndex] = await Promise.all(
      indices.map(async (index) => ({
        exists: await esClient.indices.exists({
          index,
        }),
        name: index,
      }))
    );

    let postureIndexAccountStats: CloudSecurityAccountsStats[] = [];
    let vulnerabilityIndexAccountStats: CloudSecurityAccountsStats[] = [];

    if (!findingIndex.exists && !vulnerabilitiesIndex.exists) return [];
    if (findingIndex.exists) {
      postureIndexAccountStats = await getIndexAccountStats(
        esClient,
        encryptedSoClient,
        logger,
        findingIndex.name,
        getPostureAccountsStatsQuery
      );
    }

    if (vulnerabilitiesIndex.exists) {
      vulnerabilityIndexAccountStats = await getIndexAccountStats(
        esClient,
        encryptedSoClient,
        logger,
        vulnerabilitiesIndex.name,
        getVulnMgmtAccountsStatsQuery
      );
    }

    return [...postureIndexAccountStats, ...vulnerabilityIndexAccountStats];
  } catch (e) {
    logger.error(`Failed to get cloud account stats v2 ${e}`);
    logger.error(`Failed to get cloud account stats v2 ${e.stack}`);
    return [];
  }
};
