/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../../common/types';

export const findSavedQueryRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/osquery/saved_query',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readSavedQueries`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const savedQueries = await savedObjectsClient.find({
        type: savedQuerySavedObjectType,
        // @ts-expect-error update types
        page: parseInt(request.query.pageIndex, 10) + 1,
        // @ts-expect-error update types
        perPage: request.query.pageSize,
        // @ts-expect-error update types
        sortField: request.query.sortField,
        // @ts-expect-error update types
        sortOrder: request.query.sortDirection,
      });

      return response.ok({
        body: savedQueries,
      });
    }
  );
};
