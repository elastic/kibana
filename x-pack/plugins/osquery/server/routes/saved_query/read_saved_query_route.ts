/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../../common/types';

export const readSavedQueryRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/osquery/saved_query/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const savedQuery = await savedObjectsClient.get(savedQuerySavedObjectType, request.params.id);

      return response.ok({
        body: savedQuery,
      });
    }
  );
};
