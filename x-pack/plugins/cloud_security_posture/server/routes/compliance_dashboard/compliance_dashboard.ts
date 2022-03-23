/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter } from 'src/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  AggregationsMultiBucketAggregateBase as Aggregation,
  AggregationsTopHitsAggregate,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { CloudPostureStats } from '../../../common/types';
import { CSP_KUBEBEAT_INDEX_PATTERN, STATS_ROUTE_PATH } from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { getResourcesTypes } from './get_resources_types';
import { getClusters } from './get_clusters';
import { getStats } from './get_stats';

export interface ClusterBucket {
  ordered_top_hits: AggregationsTopHitsAggregate;
}

interface ClustersQueryResult {
  aggs_by_cluster_id: Aggregation<ClusterBucket>;
}

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

export const getLatestFindingQuery = (): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  size: 0,
  query: {
    match_all: {},
  },
  aggs: {
    aggs_by_cluster_id: {
      terms: { field: 'cluster_id.keyword' },
      aggs: {
        ordered_top_hits: {
          top_hits: {
            size: 1,
            sort: {
              '@timestamp': {
                order: 'desc',
              },
            },
          },
        },
      },
    },
  },
});

const getLatestCyclesIds = async (esClient: ElasticsearchClient): Promise<string[]> => {
  const queryResult = await esClient.search<unknown, ClustersQueryResult>(getLatestFindingQuery(), {
    meta: true,
  });

  const clusters = queryResult.body.aggregations?.aggs_by_cluster_id.buckets;
  if (!Array.isArray(clusters)) throw new Error('missing aggs by cluster id');

  return clusters.map((c) => {
    const topHit = c.ordered_top_hits.hits.hits[0];
    if (!topHit) throw new Error('missing cluster latest hit');
    return topHit._source.cycle_id;
  });
};

// TODO: Utilize ES "Point in Time" feature https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
export const defineGetComplianceDashboardRoute = (
  router: IRouter,
  cspContext: CspAppContext
): void =>
  router.get(
    {
      path: STATS_ROUTE_PATH,
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const latestCyclesIds = await getLatestCyclesIds(esClient);
        const query: QueryDslQueryContainer = {
          bool: {
            should: latestCyclesIds.map((id) => ({
              match: { 'cycle_id.keyword': { query: id } },
            })),
          },
        };

        const [stats, resourcesTypes, clusters] = await Promise.all([
          getStats(esClient, query),
          getResourcesTypes(esClient, query),
          getClusters(esClient, query),
        ]);

        const body: CloudPostureStats = {
          stats,
          resourcesTypes,
          clusters,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
