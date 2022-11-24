/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';
import { ByResourceType, Evaluation, StatsEntity, Weather } from './foo';
import type { CspmIndicesStats, IndexStats } from './types';

// TODO: fetch doc count in finding index per cluster
// TODO: fetch score per cluster
// TODO: define returned types
// TODO: fix schema.ts

export const getAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<IndexStats | {}> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
    });

    if (isIndexExists) {
      await getAccountStatsByResourceType(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS);
    }

    return {};
  } catch (e) {
    logger.error(`Failed to get accounts stats ${e}`);
    return {};
  }
};

const getAccountStatsByResourceType = async (esClient: ElasticsearchClient, index: string) => {
  const accountStats = await esClient.search<unknown, Weather>({
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
          resource_type: {
            terms: {
              field: 'resource.type',
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

  const accounts = accountStats.aggregations?.accounts.buckets?.map((account) => {
    const byResourceType = account.resource_type?.buckets.map((resourceType: ByResourceType) => {
      const boo = resourceType.evaluation.buckets.map((evaluation: StatsEntity) => {
        return { [evaluation.key]: evaluation.doc_count };
      });
      const allFruits = Object.assign({}, ...boo);

      return {
        [resourceType.key]: {
          doc_count: resourceType.doc_count,
          ...allFruits,
        },
      };
    });

    // const entries = Object.fromEntries(byResourceType.map((x) => Object.entries(x)[0]));
    // const obj = Object.fromEntries(entries);

    const zoo = {
      account_id: account.key,
      latest_findings_doc_count: account.doc_count,
      ...Object.fromEntries(byResourceType.map((x) => Object.entries(x)[0])),
    };

    return zoo;
  });

  console.log(JSON.stringify(accounts));
};
