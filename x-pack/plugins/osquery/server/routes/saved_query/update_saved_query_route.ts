/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../../common/types';

export const updateSavedQueryRoute = (router: IRouter) => {
  router.put(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      // @ts-expect-error update types
      const { title, description, command } = request.body;

      const savedQuerySO = await savedObjectsClient.update(
        savedQuerySavedObjectType,
        // @ts-expect-error update types
        request.params.id,
        {
          title,
          description,
          command,
          created: Date.now(),
        }
      );

      return response.ok({
        body: savedQuerySO,
      });
    }
  );
};
