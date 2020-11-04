/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from 'kibana/server';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
} from '../../../../../../common/constants';
// @ts-ignore
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';
// @ts-ignore
import { handleError } from '../../../../../lib/errors';
import { RouteDependencies } from '../../../../../types';

const queryBody = {
  size: 0,
  query: {
    bool: {
      must: [
        {
          range: {
            timestamp: {
              gte: 'now-12h',
            },
          },
        },
      ],
    },
  },
  aggs: {
    types: {
      terms: {
        field: '_index',
        size: 10,
      },
    },
  },
};

const checkLatestMonitoringIsLegacy = async (context: RequestHandlerContext, index: string) => {
  const { client: esClient } = context.core.elasticsearch.legacy;
  const result = await esClient.callAsCurrentUser('search', {
    index,
    body: queryBody,
  });

  const { aggregations } = result;
  const counts = {
    legacyIndicesCount: 0,
    mbIndicesCount: 0,
  };

  if (!aggregations) {
    return counts;
  }

  const {
    types: { buckets },
  } = aggregations;
  counts.mbIndicesCount = buckets.filter(({ key }: { key: string }) => key.includes('-mb-')).length;

  counts.legacyIndicesCount = buckets.length - counts.mbIndicesCount;
  return counts;
};

export function internalMonitoringCheckRoute(
  server: { config: () => unknown },
  npRoute: RouteDependencies
) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/elasticsearch_settings/check/internal_monitoring',
      validate: {
        body: schema.object({
          ccs: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const typeCount = {
          legacy_indices: 0,
          mb_indices: 0,
        };

        const config = server.config();
        const { ccs } = request.body;
        const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs, true);
        const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs, true);
        const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs, true);
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
