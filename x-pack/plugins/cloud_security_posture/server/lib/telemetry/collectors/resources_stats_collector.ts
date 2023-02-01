/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { CspmResourcesStats } from './types';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';
import { getIdentifierRuntimeMapping } from './accounts_stats_collector';

interface ResourcesStats {
  accounts: {
    buckets: AccountEntity[];
  };
}

export interface AccountEntity {
  key: string; // account_id
  doc_count: number;
  resource_type: {
    buckets: ResourceType[];
  };
}

interface ResourceType {
  key: string; // resource_type
  doc_count: number;
  resource_sub_type: {
    buckets: ResourceSubType[];
  };
}

interface ResourceSubType {
  key: string; // resource_sub_type
  doc_count: number;
  evaluation: {
    buckets: EvaluationStats[];
  };
}

interface EvaluationStats {
  key: string; // passed / failed
  doc_count: number;
}

const getResourcesStatsQuery = (index: string): SearchRequest => ({
  index,
  query: {
    match_all: {},
  },
  runtime_mappings: getIdentifierRuntimeMapping(),
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
        resource_type: {
          terms: {
            field: 'resource.type',
            order: {
              _count: 'desc',
            },
            size: 100,
          },
          aggs: {
            resource_sub_type: {
              terms: {
                field: 'resource.sub_type',
                order: {
                  _count: 'desc',
                },
                size: 100,
              },
              aggs: {
                evaluation: {
                  terms: {
                    field: 'result.evaluation',
                    order: {
                      _count: 'desc',
                    },
                    size: 5,
                    shard_size: 25,
                  },
                },
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

const getEvaluationStats = (resourceSubType: ResourceSubType) => {
  const passed =
    resourceSubType.evaluation.buckets.find((evaluation) => evaluation.key === 'passed')
      ?.doc_count || 0;
  const failed =
    resourceSubType.evaluation.buckets.find((evaluation) => evaluation.key === 'failed')
      ?.doc_count || 0;
  return { passed_findings_count: passed, failed_findings_count: failed };
};

const getCspmResourcesStats = (
  aggregatedResourcesStats: ResourcesStats,
  logger: Logger
): CspmResourcesStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const resourcesStats = accounts.map((account) => {
    const accountId = account.key;
    return account.resource_type.buckets.map((resourceType) => {
      return resourceType.resource_sub_type.buckets.map((resourceSubType) => {
        const evaluation = getEvaluationStats(resourceSubType);
        return {
          account_id: accountId,
          resource_type: resourceType.key,
          resource_type_doc_count: resourceType.doc_count,
          resource_sub_type: resourceSubType.key,
          resource_sub_type_doc_count: resourceSubType.doc_count,
          ...evaluation,
        };
      });
    });
  });
  logger.info('CSPM telemetry: resources stats was sent');

  return resourcesStats.flat(2);
};

export const getResourcesStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CspmResourcesStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    if (isIndexExists) {
      const resourcesStatsResponse = await esClient.search<unknown, ResourcesStats>(
        getResourcesStatsQuery(LATEST_FINDINGS_INDEX_DEFAULT_NS)
      );

      const cspmResourcesStats = resourcesStatsResponse.aggregations
        ? getCspmResourcesStats(resourcesStatsResponse.aggregations, logger)
        : [];

      return cspmResourcesStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get resources stats ${e}`);
    return [];
  }
};
