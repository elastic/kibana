/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';
import { createEnterpriseSearchRequestHandler } from '../../lib/enterprise_search_request_handler';

interface ICredentialsResponse {
  results: object[];
  meta?: {
    page?: {
      total_results: number;
    };
  };
}

export function registerCredentialsRoutes({ router, config, log }: IRouteDependencies) {
  router.get(
    {
      path: '/api/app_search/credentials',
      validate: {
        query: schema.object({
          'page[current]': schema.number(),
        }),
      },
    },
    createEnterpriseSearchRequestHandler<ICredentialsResponse>({
      config,
      log,
      path: '/as/credentials/collection',
      hasValidData: (body?: ICredentialsResponse) => {
        return Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number';
      },
    })
  );
}
