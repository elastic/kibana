/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../lib/saved_query/saved_object_mappings';

export const findSavedQueryRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/osquery/saved_query',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const savedQueries = await savedObjectsClient.find({
        type: savedQuerySavedObjectType,
        page: parseInt(request.query.pageIndex, 10) + 1,
        perPage: request.query.pageSize,
        sortField: request.query.sortField,
        sortOrder: request.query.sortDirection,
      });

      return response.ok({
        body: savedQueries,
      });
    }
  );
};
