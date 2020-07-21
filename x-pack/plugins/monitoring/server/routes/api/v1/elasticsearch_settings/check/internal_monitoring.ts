/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
// @ts-ignore
import { getIndexPatterns } from '../../../../../lib/cluster/get_index_patterns';
// @ts-ignore
import { handleError } from '../../../../../lib/errors';
import { RouteDependencies } from '../../../../../types';

const queryBody = {
  size: 15,
  query: {
    bool: {
      filter: [
        {
          range: {
            timestamp: {
              gte: 'now-15m',
              lte: 'now',
            },
          },
        },
      ],
    },
  },
  sort: [
    {
      timestamp: {
        order: 'desc',
      },
    },
  ],
  _source: {
    excludes: ['*'],
  },
};

const checkLatestMonitoringIsLegacy = async (context: RequestHandlerContext, index: string) => {
  const { client: esClient } = context.core.elasticsearch.legacy;
  const result = await esClient.callAsCurrentUser('search', {
    index,
    body: queryBody,
  });

  const {
    hits: { hits },
  } = result;
  const counts = {
    legacyIndicesCount: 0,
    mbIndicesCount: 0,
  };

  if (!hits?.length) {
    return counts;
  }

  counts.mbIndicesCount = hits.filter(({ _index }: { _index: string }) =>
    _index.includes('-mb-')
  ).length;

  counts.legacyIndicesCount = hits.length - counts.mbIndicesCount;

  return counts;
};

export function internalMonitoringCheckRoute(server: unknown, npRoute: RouteDependencies) {
  npRoute.router.get(
    {
      path: '/api/monitoring/v1/elasticsearch_settings/check/internal_monitoring',
      validate: false,
    },
    async (context, _request, response) => {
      try {
        const typeCount = {
          legacy_indices: 0,
          mb_indices: 0,
        };

        const { esIndexPattern, kbnIndexPattern, lsIndexPattern } = getIndexPatterns(server);
        const indexCounts = await Promise.all([
          checkLatestMonitoringIsLegacy(context, esIndexPattern),
          checkLatestMonitoringIsLegacy(context, kbnIndexPattern),
          checkLatestMonitoringIsLegacy(context, lsIndexPattern),
        ]);

        indexCounts.forEach((counts) => {
          typeCount.legacy_indices += counts.legacyIndicesCount;
          typeCount.mb_indices += counts.mbIndicesCount;
        });

        return response.ok({
          body: typeCount,
        });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
