/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
} from '../../../../../../common/constants';
// @ts-ignore
import { prefixIndexPattern } from '../../../../../../common/ccs_utils';
// @ts-ignore
import { handleError } from '../../../../../lib/errors';
import { RouteDependencies, LegacyServer } from '../../../../../types';

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
  const client = (await context.core).elasticsearch.client.asCurrentUser;
  const result = await client.search<estypes.SearchResponse<unknown>>({
    index,
    body: queryBody,
  } as estypes.SearchRequest);

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
  } = aggregations as { types: { buckets: Array<{ key: string }> } };
  counts.mbIndicesCount = buckets.filter(({ key }: { key: string }) => key.includes('-mb-')).length;

  counts.legacyIndicesCount = buckets.length - counts.mbIndicesCount;
  return counts;
};

export function internalMonitoringCheckRoute(server: LegacyServer, npRoute: RouteDependencies) {
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

        const config = server.config;
        const { ccs } = request.body;
        const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
        const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);
        const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);
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
