/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';
import { IApiToken, IMeta, ICredentialsDetails } from '../../../common/types/app_search';

interface ICredentialsResponse {
  results: IApiToken[];
  meta: IMeta;
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
  router.get(
    {
      path: '/api/app_search/credentials/details',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/credentials/details',
      hasValidData: (body?: ICredentialsDetails) => {
        return !!body?.apiUrl;
      },
    })
  );
  router.delete(
    {
      path: '/api/app_search/credentials/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      pathForward: { from: '/api/app_search/', to: '/as/' },
    })
  );
}
