/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RequestHandlerContext } from '@kbn/core/server';
import { prefixIndexPatternWithCcs } from '../../../../../../common/ccs_utils';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH_MONITORING,
} from '../../../../../../common/constants';
import {
  postElasticsearchSettingsInternalMonitoringRequestPayloadRT,
  postElasticsearchSettingsInternalMonitoringResponsePayloadRT,
} from '../../../../../../common/http_api/elasticsearch_settings';
import { createValidationFunction } from '../../../../../lib/create_route_validation_function';
import { handleError } from '../../../../../lib/errors';
import { MonitoringCore, RouteDependencies } from '../../../../../types';

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

export function internalMonitoringCheckRoute(server: MonitoringCore, npRoute: RouteDependencies) {
  const validateBody = createValidationFunction(
    postElasticsearchSettingsInternalMonitoringRequestPayloadRT
  );

  npRoute.router.post(
    {
      path: '/api/monitoring/v1/elasticsearch_settings/check/internal_monitoring',
      validate: {
        body: validateBody,
      },
      options: {
        access: 'internal',
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
        const esIndexPattern = prefixIndexPatternWithCcs(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
        const kbnIndexPattern = prefixIndexPatternWithCcs(config, INDEX_PATTERN_KIBANA, ccs);
        const lsIndexPattern = prefixIndexPatternWithCcs(
          config,
          INDEX_PATTERN_LOGSTASH_MONITORING,
          ccs
        );
        const indexCounts = await Promise.all([
          checkLatestMonitoringIsLegacy(context, esIndexPattern),
          checkLatestMonitoringIsLegacy(context, kbnIndexPattern),
          checkLatestMonitoringIsLegacy(context, lsIndexPattern),
        ]);

        indexCounts.forEach((counts) => {
          typeCount.legacy_indices += counts.legacyIndicesCount;
          typeCount.mb_indices += counts.mbIndicesCount;
        });

        return response.ok(
          postElasticsearchSettingsInternalMonitoringResponsePayloadRT.encode({
            body: typeCount,
          })
        );
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
