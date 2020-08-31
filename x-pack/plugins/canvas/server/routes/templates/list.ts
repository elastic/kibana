/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import { TEMPLATE_TYPE, API_ROUTE_TEMPLATES } from '../../../common/lib/constants';
import { catchErrorHandler } from '../catch_error_handler';
import { CanvasTemplate } from '../../../types';

export function initializeListTemplates(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: `${API_ROUTE_TEMPLATES}`,
      validate: {
        params: schema.object({}),
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const templates = await savedObjectsClient.find<CanvasTemplate>({
        type: TEMPLATE_TYPE,
        sortField: 'name.keyword',
        sortOrder: 'desc',
        search: '*',
        searchFields: ['name', 'help'],
        fields: ['id', 'name', 'help', 'tags'],
      });

      return response.ok({
        body: {
          templates: templates.saved_objects.map((hit) => ({
            ...hit.attributes,
          })),
        },
      });
    })
  );
}
