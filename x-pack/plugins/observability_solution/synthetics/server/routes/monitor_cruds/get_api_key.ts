/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { IKibanaResponse } from '@kbn/core-http-server';
import { ELASTIC_MANAGED_LOCATIONS_DISABLED } from './add_monitor_project';
import { SyntheticsRestApiRouteFactory } from '../types';
import { generateProjectAPIKey } from '../../synthetics_service/get_api_key';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export interface ProjectAPIKeyResponse {
  apiKey: SecurityCreateApiKeyResponse | null;
}

export const getAPIKeySyntheticsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_APIKEY,
  validate: {
    query: schema.object({
      accessToElasticManagedLocations: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({
    request,
    server,
    response,
  }): Promise<ProjectAPIKeyResponse | IKibanaResponse> => {
    const { accessToElasticManagedLocations } = request.query;

    if (accessToElasticManagedLocations) {
      const elasticManagedLocationsEnabled =
        Boolean(
          (
            await server.coreStart?.capabilities.resolveCapabilities(request, {
              capabilityPath: 'uptime.*',
            })
          ).uptime.elasticManagedLocationsEnabled
        ) ?? true;
      if (!elasticManagedLocationsEnabled) {
        return response.customError({
          body: { message: ELASTIC_MANAGED_LOCATIONS_DISABLED },
          statusCode: 403,
        });
      }
    }

    const apiKey = await generateProjectAPIKey({
      request,
      server,
      accessToElasticManagedLocations,
    });

    return { apiKey };
  },
});
