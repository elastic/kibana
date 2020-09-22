/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';
import { ENGINES_PAGE_SIZE } from '../../../common/constants';

interface IEnginesResponse {
  results: object[];
  meta: { page: { total_results: number } };
}

export function registerEnginesRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines',
      validate: {
        query: schema.object({
          type: schema.oneOf([schema.literal('indexed'), schema.literal('meta')]),
          pageIndex: schema.number(),
        }),
      },
    },
    async (context, request, response) => {
      const { type, pageIndex } = request.query;

      return enterpriseSearchRequestHandler.createRequest({
        path: '/as/engines/collection',
        params: {
          type,
          'page[current]': pageIndex,
          'page[size]': ENGINES_PAGE_SIZE,
        },
        hasValidData: (body?: IEnginesResponse) =>
          Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number',
      })(context, request, response);
    }
  );
}
