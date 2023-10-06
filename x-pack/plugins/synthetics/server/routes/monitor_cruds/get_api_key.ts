/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ProjectAPIKey } from '../../../public/apps/synthetics/state/monitor_management/api';
import { SyntheticsRestApiRouteFactory } from '../types';
import { generateAPIKey } from '../../synthetics_service/get_api_key';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getAPIKeySyntheticsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_APIKEY,
  validate: {
    query: schema.object({
      accessToElasticManagedLocations: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ request, server }): Promise<ProjectAPIKey> => {
    const { accessToElasticManagedLocations } = request.query;

    const apiKey = await generateAPIKey({
      request,
      server,
      accessToElasticManagedLocations,
      projectAPIKey: true,
    });

    return { apiKey };
  },
});
