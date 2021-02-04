/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../lib/saved_query/saved_object_mappings';

export const deleteSavedQueryRoute = (router: IRouter) => {
  router.delete(
    {
      path: '/api/osquery/saved_query',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const { savedQueryIds } = request.body;

      await Promise.all(
        savedQueryIds.map(
          async (savedQueryId) =>
            await savedObjectsClient.delete(savedQuerySavedObjectType, savedQueryId, {
              refresh: 'wait_for',
            })
        )
      );

      return response.ok({
        body: savedQueryIds,
      });
    }
  );
};
