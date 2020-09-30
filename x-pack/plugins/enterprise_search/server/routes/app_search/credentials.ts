/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';

interface ICredential {
  id: string;
  key: string;
  name: string;
  type: string;
  access_all_engines: boolean;
}
interface ICredentialsResponse {
  results: ICredential[];
  meta?: {
    page?: {
      current: number;
      total_results: number;
      total_pages: number;
      size: number;
    };
  };
}

export function registerCredentialsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
  router.get(
    {
      path: '/api/app_search/credentials',
      validate: {
        query: schema.object({
          'page[current]': schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/credentials/collection',
      hasValidData: (body?: ICredentialsResponse) => {
        return Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number';
      },
    })
  );
}
