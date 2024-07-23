/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';

import {
  GetInfraHostsCountRequestBodyPayload,
  GetInfraHostsCountRequestBodyPayloadRT,
  GetInfraHostsCountResponsePayloadRT,
} from '../../../common/http_api/get_hosts_count_api';

import { InfraBackendLibs } from '../../lib/infra_types';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getHostsCount } from './lib/host/get_hosts_count';

export const initInfraHostsCountRoute = (libs: InfraBackendLibs) => {
  const validateBody = createRouteValidationFunction(GetInfraHostsCountRequestBodyPayloadRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/infra/hosts_count',
      validate: {
        body: validateBody,
      },
    },
    async (requestContext, request, response) => {
      const params: GetInfraHostsCountRequestBodyPayload = request.body;
      const { query, from, to } = request.body;

      try {
        const infraMetricsClient = await getInfraMetricsClient({
          framework,
          request,
          infraSources: libs.sources,
          requestContext,
          sourceId: params.sourceId,
        });

        const hostsCount = await getHostsCount({
          infraMetricsClient,
          query: (query?.bool as Record<string, string>) ?? undefined,
          from,
          to,
        });

        return response.ok({
          body: GetInfraHostsCountResponsePayloadRT.encode({
            type: params.type,
            count: hostsCount,
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
