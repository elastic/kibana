/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields, Sort } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SearchAlertsRequestBody } from '../../../../../common/api/detection_engine/signals';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

export const querySignalsRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
      access: 'public',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SearchAlertsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { query, aggs, _source, fields, track_total_hits, size, runtime_mappings, sort } =
          request.body;
        const siemResponse = buildSiemResponse(response);
        if (
          query == null &&
          aggs == null &&
          _source == null &&
          fields == null &&
          track_total_hits == null &&
          size == null &&
          sort == null
        ) {
          return siemResponse.error({
            statusCode: 400,
            body: '"value" must have at least 1 children',
          });
        }
        try {
          const spaceId = (await context.securitySolution).getSpaceId();
          const indexPattern = ruleDataClient?.indexNameWithNamespace(spaceId);
          const result = await esClient.search({
            index: indexPattern,
            body: {
              query,
              aggs: aggs as Record<string, AggregationsAggregationContainer>,
              _source,
              fields,
              track_total_hits,
              size,
              runtime_mappings: runtime_mappings as MappingRuntimeFields,
              sort: sort as Sort,
            },
            ignore_unavailable: true,
          });
          return response.ok({ body: result });
        } catch (err) {
          // error while getting or updating signal with id: id in signal index .siem-signals
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
