/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  GetInfraMetricsRequestBodyPayloadRT,
  GetInfraMetricsResponsePayloadRT,
} from '../../../common/http_api/infra';
import {
  GetInfraAssetCountRequestBodyPayloadRT,
  GetInfraAssetCountResponsePayloadRT,
  GetInfraAssetCountRequestParamsPayloadRT,
} from '../../../common/http_api/asset_count_api';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { getInfraAlertsClient } from '../../lib/helpers/get_infra_alerts_client';
import { getHosts } from './lib/host/get_hosts';
import { getHostsCount } from './lib/host/get_hosts_count';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getApmDataAccessServices } from '../../lib/helpers/get_apm_data_access_services';

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
    async (context, request, response) => {
      const { from, to, metrics, limit, type, query } = request.body;

      try {
        const [infraMetricsClient, alertsClient, apmDataAccessServices] = await Promise.all([
          getInfraMetricsClient({ request, libs, context }),
          getInfraAlertsClient({ libs, request }),
          getApmDataAccessServices({ request, libs, context }),
        ]);

        const hosts = await getHosts({
          from,
          to,
          metrics,
          limit,
          type,
          query,
          alertsClient,
          infraMetricsClient,
          apmDataAccessServices,
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
    async (context, request, response) => {
      const { body, params } = request;
      const { assetType } = params;
      const { query, from, to } = body;

      try {
        const [infraMetricsClient, apmDataAccessServices] = await Promise.all([
          getInfraMetricsClient({ request, libs, context }),
          getApmDataAccessServices({ request, libs, context }),
        ]);

        const assetCount = await getHostsCount({
          query,
          from,
          to,
          infraMetricsClient,
          apmDataAccessServices,
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
