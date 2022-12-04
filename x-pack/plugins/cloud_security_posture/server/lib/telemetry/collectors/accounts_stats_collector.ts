/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { calculatePostureScore } from '../../../routes/compliance_dashboard/get_stats';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';
import type { CspmAccountsStats } from './types';

export interface Accounts {
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

export interface ResourceType {
  key: string;
  doc_count: number;
  evaluation: { buckets: StatsEntity[] };
}

export interface StatsEntity {
  key: string;
  doc_count: number;
  agents: Agents;
}
export interface Agents {
  value: number;
}

export interface ResourceStats {
  [key: string]: {
    doc_count: number;
    passed: number;
    failed: number;
  };
}

export const getAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CspmAccountsStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    if (isIndexExists) {
      return await getAccountStatsByResourceType(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS);
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get accounts stats ${e}`);
    return [];
  }
};

const getClusterScore = (evaluationByResourceType: ResourceStats): number => {
  let passed = 0;
  let failed = 0;
  Object.entries(evaluationByResourceType).forEach(([key, value], index) => {
    passed += value.passed ? value.passed : 0;
    failed += value.failed ? value.failed : 0;
  });
  return calculatePostureScore(passed, failed);
};

const getAccountStatsByResourceType = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<CspmAccountsStats[]> => {
  let agents = 1;
  const accountsStats = await esClient.search<unknown, Accounts>(getAccountStatsQuery(index));

  const accountsBucket = accountsStats.aggregations?.accounts.buckets
    ? accountsStats.aggregations?.accounts.buckets
    : [];

  const accounts = accountsBucket.map((account) => {
    const resourcesBucket = account.resource_type?.buckets ? account.resource_type?.buckets : [];

    const evaluationByResourceType: ResourceStats[] = resourcesBucket.map(
      (resourceType: ResourceType) => {
        const evaluationBucket = resourceType.evaluation.buckets
          ? resourceType.evaluation.buckets
          : [];

        const byEvaluation = evaluationBucket.map((evaluation: StatsEntity) => {
          agents = Math.max(agents, evaluation.agents.value);
          return { [evaluation.key]: evaluation.doc_count };
        });

        return {
          [resourceType.key]: {
            doc_count: resourceType.doc_count,
            ...Object.assign({}, ...byEvaluation),
          },
        };
      }
    );

    const parsedEvaluationByResourceType = evaluationByResourceType
      ? Object.fromEntries(evaluationByResourceType.map((x) => Object.entries(x)[0]))
      : {};
    const accountScore = getClusterScore(parsedEvaluationByResourceType);

    return {
      account_id: account.key,
      account_score: accountScore,
      latest_findings_doc_count: account.doc_count,
      resource_type: parsedEvaluationByResourceType,
      agents_count: agents,
    };
  });

  return accounts;
};

const getAccountStatsQuery = (index: string): SearchRequest => ({
  index,
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'cluster_id',
        size: 100,
      },
      aggs: {
        resource_type: {
          terms: {
            field: 'resource.sub_type',
            order: {
              _count: 'desc',
            },
            size: 100,
            shard_size: 25,
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
              aggs: {
                agents: {
                  cardinality: {
                    field: 'agent.id',
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
