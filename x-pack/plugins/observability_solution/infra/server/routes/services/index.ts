/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetServicesRequestQueryRT,
  GetServicesRequestQuery,
  ServicesAPIResponseRT,
} from '../../../common/http_api/host_details';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getServices } from '../../lib/host_details/get_services';
import { validateStringAssetFilters } from './lib/utils';
import { createSearchClient } from '../../lib/create_search_client';
import { buildRouteValidationWithExcess } from '../../utils/route_validation';

export const initServicesRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  framework.registerRoute<unknown, GetServicesRequestQuery, unknown>(
    {
      method: 'get',
      path: '/api/infra/services',
      validate: {
        query: (q, res) => {
          const [invalidResponse, parsedFilters] = validateStringAssetFilters(q, res);
          if (invalidResponse) {
            return invalidResponse;
          }
          q.validatedFilters = parsedFilters;
          return buildRouteValidationWithExcess(GetServicesRequestQueryRT)(q, res);
        },
      },
    },
    async (requestContext, request, response) => {
      const [{ savedObjects }] = await libs.getStartServices();
      const { from, to, size = 10, validatedFilters } = request.query;

      const client = createSearchClient(requestContext, framework, request);
      const soClient = savedObjects.getScopedClient(request);
      const apmIndices = await libs.plugins.apmDataAccess.setup.getApmIndices(soClient);
      const services = await getServices(client, apmIndices, {
        from,
        to,
        size,
        filters: validatedFilters!,
      });
      return response.ok({
        body: ServicesAPIResponseRT.encode(services),
      });
    }
  );
};
