/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';

import type { BoolQuery } from '@kbn/es-query';
import {
  type GetInfraMetricsRequestBodyPayload,
  GetInfraMetricsRequestBodyPayloadRT,
  GetInfraMetricsResponsePayloadRT,
} from '../../../common/http_api/infra';
import {
  type GetInfraAssetCountRequestBodyPayload,
  type GetInfraAssetCountRequestParamsPayload,
  GetInfraAssetCountRequestBodyPayloadRT,
  GetInfraAssetCountResponsePayloadRT,
  GetInfraAssetCountRequestParamsPayloadRT,
} from '../../../common/http_api/asset_count_api';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { getInfraAlertsClient } from '../../lib/helpers/get_infra_alerts_client';
import { getHosts } from './lib/host/get_hosts';
import { getHostsCount } from './lib/host/get_hosts_count';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';

export const initInfraAssetRoutes = (libs: InfraBackendLibs) => {
  const validateMetricsBody = createRouteValidationFunction(GetInfraMetricsRequestBodyPayloadRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/infra',
      validate: {
        body: validateMetricsBody,
      },
    },
    async (requestContext, request, response) => {
      const params: GetInfraMetricsRequestBodyPayload = request.body;

      try {
        const infraMetricsClient = await getInfraMetricsClient({
          framework,
          request,
          infraSources: libs.sources,
          requestContext,
          sourceId: params.sourceId,
        });

        const alertsClient = await getInfraAlertsClient({
          getStartServices: libs.getStartServices,
          request,
        });

        const hosts = await getHosts({
          infraMetricsClient,
          alertsClient,
          params,
        });

        return response.ok({
          body: GetInfraMetricsResponsePayloadRT.encode(hosts),
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

  const validateCountBody = createRouteValidationFunction(GetInfraAssetCountRequestBodyPayloadRT);
  const validateCountParams = createRouteValidationFunction(
    GetInfraAssetCountRequestParamsPayloadRT
  );

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/{assetType}/count',
      validate: {
        body: validateCountBody,
        params: validateCountParams,
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
          query: (query?.bool as BoolQuery) ?? undefined,
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
