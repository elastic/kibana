/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectAttributes } from '@kbn/core/server';
import { RouteInitializerDeps } from '..';
import { CUSTOM_ELEMENT_TYPE, API_ROUTE_CUSTOM_ELEMENT } from '../../../common/lib/constants';

export function initializeFindCustomElementsRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: `${API_ROUTE_CUSTOM_ELEMENT}/find`,
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
        const customElements = await savedObjectsClient.find<SavedObjectAttributes>({
          type: CUSTOM_ELEMENT_TYPE,
          sortField: '@timestamp',
          sortOrder: 'desc',
          search: name ? `${name}* | ${name}` : '*',
          searchFields: ['name'],
          fields: [
            'id',
            'name',
            'displayName',
            'help',
            'image',
            'content',
            '@created',
            '@timestamp',
          ],
          page,
          perPage,
        });

        return response.ok({
          body: {
            total: customElements.total,
            customElements: customElements.saved_objects.map((hit) => ({
              id: hit.id,
              ...hit.attributes,
            })),
          },
        });
      } catch (error) {
        return response.ok({
          body: {
            total: 0,
            customElements: [],
          },
        });
      }
    }
  );
}
