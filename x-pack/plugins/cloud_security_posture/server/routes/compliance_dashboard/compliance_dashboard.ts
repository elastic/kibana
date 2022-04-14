/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  AggregationsTopHitsAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ComplianceDashboardData } from '../../../common/types';
import { STATS_ROUTE_PATH } from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { getResourcesTypes } from './get_resources_types';
import { ClusterWithoutTrend, getClusters } from './get_clusters';
import { getStats } from './get_stats';
import { CspRouter } from '../../types';
import { getTrends, Trends } from './get_trends';

export interface ClusterBucket {
  ordered_top_hits: AggregationsTopHitsAggregate;
}

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

const getClustersTrends = (clustersWithoutTrends: ClusterWithoutTrend[], trends: Trends) =>
  clustersWithoutTrends.map((cluster) => ({
    ...cluster,
    trend: trends.map(({ timestamp, clusters: clustersTrendData }) => ({
      timestamp,
      ...clustersTrendData[cluster.meta.clusterId],
    })),
  }));

const getSummaryTrend = (trends: Trends) =>
  trends.map(({ timestamp, summary }) => ({ timestamp, ...summary }));

// TODO: Utilize ES "Point in Time" feature https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
export const defineGetComplianceDashboardRoute = (
  router: CspRouter,
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
        const query: QueryDslQueryContainer = {
          match_all: {},
        };

        const [stats, resourcesTypes, clustersWithoutTrends, trends] = await Promise.all([
          getStats(esClient, query),
          getResourcesTypes(esClient, query),
          getClusters(esClient, query),
          getTrends(esClient),
        ]);

        const clusters = getClustersTrends(clustersWithoutTrends, trends);
        const trend = getSummaryTrend(trends);

        const body: ComplianceDashboardData = {
          stats,
          resourcesTypes,
          clusters,
          trend,
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
