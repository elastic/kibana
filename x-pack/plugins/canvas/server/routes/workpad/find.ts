/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectAttributes } from '@kbn/core/server';
import { RouteInitializerDeps } from '..';
import { CANVAS_TYPE, API_ROUTE_WORKPAD } from '../../../common/lib/constants';

export function initializeFindWorkpadsRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: `${API_ROUTE_WORKPAD}/find`,
      validate: {
        query: schema.object({
          name: schema.string(),
          page: schema.maybe(schema.number()),
          perPage: schema.number(),
        }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const { name, page, perPage } = request.query;

      try {
        const workpads = await savedObjectsClient.find<SavedObjectAttributes>({
          type: CANVAS_TYPE,
          sortField: '@timestamp',
          sortOrder: 'desc',
          search: name ? `${name}* | ${name}` : '*',
          searchFields: ['name'],
          fields: ['id', 'name', '@created', '@timestamp'],
          page,
          perPage,
        });

        return response.ok({
          body: {
            total: workpads.total,
            workpads: workpads.saved_objects.map((hit) => ({ id: hit.id, ...hit.attributes })),
          },
        });
      } catch (error) {
        return response.ok({
          body: {
            total: 0,
            workpads: [],
          },
        });
      }
    }
  );
}
