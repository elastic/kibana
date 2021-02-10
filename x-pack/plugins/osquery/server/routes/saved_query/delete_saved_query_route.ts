/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../../common/types';

export const deleteSavedQueryRoute = (router: IRouter) => {
  router.delete(
    {
      path: '/internal/osquery/saved_query',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      // @ts-expect-error update types
      const { savedQueryIds } = request.body;

      await Promise.all(
        savedQueryIds.map(
          // @ts-expect-error update types
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
