/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/core/server';
import { RouteInitializerDeps } from '..';
import { CANVAS_TYPE, API_ROUTE_WORKPAD } from '../../../common/lib/constants';

export function initializeHasWorkpadsRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.versioned
    .get({
      path: `${API_ROUTE_WORKPAD}/hasWorkpads`,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {},
        },
      },
      async (context, request, response) => {
        const savedObjectsClient = (await context.core).savedObjects.client;

        try {
          const workpads = await savedObjectsClient.find<SavedObjectAttributes>({
            type: CANVAS_TYPE,
            fields: ['id'],
            perPage: 1,
            // search across all spaces
            namespaces: ['*'],
          });

          return response.ok({
            body: {
              hasWorkpads: workpads.total > 0,
            },
          });
        } catch (error) {
          return response.ok({
            body: {
              hasWorkpads: false,
            },
          });
        }
      }
    );
}
