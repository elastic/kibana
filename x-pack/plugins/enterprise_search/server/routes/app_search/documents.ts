/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerDocumentRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{engineName}/documents/{documentId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          documentId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/as/engines/${request.params.engineName}/documents/${request.params.documentId}`,
      })(context, request, response);
    }
  );
  router.delete(
    {
      path: '/api/app_search/engines/{engineName}/documents/{documentId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          documentId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/as/engines/${request.params.engineName}/documents/${request.params.documentId}`,
      })(context, request, response);
    }
  );
}
