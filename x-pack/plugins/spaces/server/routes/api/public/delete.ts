/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';
import { PublicRouteDeps, PublicRouteRequestFacade } from '.';

export function initDeleteSpacesApi(deps: PublicRouteDeps) {
  const { http, savedObjects, spacesService, routePreCheckLicenseFn } = deps;

  http.route({
    method: 'DELETE',
    path: '/api/spaces/space/{id}',
    async handler(request: PublicRouteRequestFacade, h: any) {
      const { SavedObjectsClient } = savedObjects;
      const spacesClient: SpacesClient = spacesService.scopedClient(request);

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
    options: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
