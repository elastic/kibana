/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
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
  handler: async ({ request, server }): Promise<ProjectAPIKeyResponse> => {
    const { accessToElasticManagedLocations } = request.query;

    const apiKey = await generateProjectAPIKey({
      request,
      server,
      accessToElasticManagedLocations,
    });

    return { apiKey };
  },
});
