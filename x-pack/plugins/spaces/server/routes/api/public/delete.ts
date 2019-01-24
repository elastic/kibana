/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';

export function initDeleteSpacesApi(server: any, routePreCheckLicenseFn: any) {
  server.route({
    method: 'DELETE',
    path: '/api/spaces/space/{id}',
    async handler(request: any, h: any) {
      const { SavedObjectsClient } = server.savedObjects;
      const spacesClient: SpacesClient = server.plugins.spaces.spacesClient.getScopedClient(
        request
      );

      const id = request.params.id;

      let result;

      try {
        result = await spacesClient.delete(id);
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return Boom.notFound();
        }
        return wrapError(error);
      }

      return h.response(result).code(204);
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
