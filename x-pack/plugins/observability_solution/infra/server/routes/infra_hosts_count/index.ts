/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';

import {
  GetInfraAssetCountRequestBodyPayload,
  GetInfraAssetCountRequestBodyPayloadRT,
  GetInfraAssetCountResponsePayloadRT,
  GetInfraAssetCountRequestParamsPayload,
} from '../../../common/http_api/get_hosts_count_api';

import { InfraBackendLibs } from '../../lib/infra_types';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getHostsCount } from './lib/host/get_hosts_count';

export const initInfraAssetCountRoute = (libs: InfraBackendLibs) => {
  const validateBody = createRouteValidationFunction(GetInfraAssetCountRequestBodyPayloadRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/{assetType}/count',
      validate: {
        body: validateBody,
      },
    },
    async (requestContext, request, response) => {
      const body: GetInfraAssetCountRequestBodyPayload = request.body;
      const params: GetInfraAssetCountRequestParamsPayload = request.params;
      const { assetType } = params;
      const { query, from, to, sourceId } = body;

      try {
        const infraMetricsClient = await getInfraMetricsClient({
          framework,
          request,
          infraSources: libs.sources,
          requestContext,
          sourceId,
        });

        const assetCount = await getHostsCount({
          infraMetricsClient,
          query: (query?.bool as Record<string, string>) ?? undefined,
          from,
          to,
        });

        return response.ok({
          body: GetInfraAssetCountResponsePayloadRT.encode({
            assetType,
            count: assetCount,
          }),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
