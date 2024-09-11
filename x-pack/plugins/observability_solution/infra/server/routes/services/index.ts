/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetServicesRequestQuery,
  GetServicesRequestQueryRT,
  ServicesAPIResponseRT,
} from '../../../common/http_api/host_details';
import { InfraBackendLibs } from '../../lib/infra_types';
import { validateStringAssetFilters } from './lib/utils';
import { buildRouteValidationWithExcess } from '../../utils/route_validation';
import { getApmDataAccessClient } from '../../lib/helpers/get_apm_data_access_client';

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
    async (context, request, response) => {
      const { from, to, size = 10, validatedFilters } = request.query;

      const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });
      const hasApmPrivileges = await apmDataAccessClient.hasPrivileges();

      const apmDataAccessServices = hasApmPrivileges
        ? await apmDataAccessClient.getServices()
        : undefined;

      const services = await apmDataAccessServices?.getHostServices({
        start: from,
        end: to,
        filters: validatedFilters!,
        size,
      });

      if (!services) {
        return response.ok({
          body: { services: [] },
        });
      }

      return response.ok({
        body: ServicesAPIResponseRT.encode(services),
      });
    }
  );
};
