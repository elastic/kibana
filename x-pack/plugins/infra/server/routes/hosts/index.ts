/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';

import {
  GetHostsRequestBodyPayloadRT,
  GetHostsRequestBodyPayload,
  GetHostsResponsePayloadRT,
} from '../../../common/http_api/hosts';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getHosts } from './lib/get_hosts';

export const initHostsRoute = (libs: InfraBackendLibs) => {
  const validateBody = createRouteValidationFunction(GetHostsRequestBodyPayloadRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/hosts',
      validate: {
        body: validateBody,
      },
    },
    async (_, request, response) => {
      const [{ savedObjects }, { data }] = await libs.getStartServices();
      const params: GetHostsRequestBodyPayload = request.body;

      try {
        const searchClient = data.search.asScoped(request);
        const soClient = savedObjects.getScopedClient(request);
        const source = await libs.sources.getSourceConfiguration(soClient, params.sourceId);

        const hosts = await getHosts({ searchClient, source, params });
        return response.ok({
          body: GetHostsResponsePayloadRT.encode(hosts),
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
