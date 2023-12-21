/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  GetServicesRequestQueryRT,
  GetServicesRequestQuery,
} from '../../../common/http_api/services';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getServices } from './lib/get_services';
import { validateStringAssetFilters } from './lib/utils';

export const initServicesRoute = (libs: InfraBackendLibs) => {
  const validate = createRouteValidationFunction(GetServicesRequestQueryRT);

  const { framework } = libs;

  framework.registerRoute<unknown, GetServicesRequestQuery, unknown>(
    {
      method: 'get',
      path: '/api/infra/services',
      validate: {
        query: (q, res) => {
          const [invalidResponse, validatedFilters] = validateStringAssetFilters(q, res);
          if (invalidResponse) {
            return invalidResponse;
          }
          if (validatedFilters) {
            q.filters = validatedFilters;
          }
          return validate(q, res);
        },
      },
    },
    async (requestContext, request, response) => {
      const [{ savedObjects }] = await libs.getStartServices();
      const { from, to, filters } = request.query;

      try {
        if (!filters) {
          throw Boom.badRequest('Invalid filters');
        }
        const coreContext = await requestContext.core;
        const searchClient = coreContext.elasticsearch.client.asCurrentUser;
        const soClient = savedObjects.getScopedClient(request);
        const apmIndices = await libs.getApmIndices(soClient);
        const services = await getServices({
          from,
          to,
          filters,
          searchClient,
          apmIndices,
        });
        return response.ok({
          body: services,
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
