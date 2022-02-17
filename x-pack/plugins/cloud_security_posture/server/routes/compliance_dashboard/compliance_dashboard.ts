/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter } from 'src/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { CloudPostureStats } from '../../../common/types';
import { CSP_KUBEBEAT_INDEX_PATTERN, STATS_ROUTE_PATH } from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { getResourcesTypes } from './get_resources_types';
import { getClusters } from './get_clusters';
import { getStats } from './get_stats';

interface LastCycle {
  cycle_id: string;
}

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

export const getLatestFindingQuery = (): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  size: 1,
  /* @ts-expect-error TS2322 - missing SearchSortContainer */
  sort: { '@timestamp': 'desc' },
  query: {
    match_all: {},
  },
});

const getLatestCycleId = async (esClient: ElasticsearchClient) => {
  const latestFinding = await esClient.search<LastCycle>(getLatestFindingQuery());
  const lastCycle = latestFinding.body.hits.hits[0];

  if (lastCycle?._source?.cycle_id === undefined) {
    throw new Error('cycle id is missing');
  }
  return lastCycle?._source?.cycle_id;
};

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
        const latestCycleID = await getLatestCycleId(esClient);

        const [stats, resourcesTypes, clusters] = await Promise.all([
          getStats(esClient, latestCycleID),
          getResourcesTypes(esClient, latestCycleID),
          getClusters(esClient, latestCycleID),
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
