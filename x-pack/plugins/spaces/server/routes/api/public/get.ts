/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@commercial/boom';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';

export function initGetSpacesApi(server: any, routePreCheckLicenseFn: any) {
  server.route({
    method: 'GET',
    path: '/api/spaces/space',
    async handler(request: any) {
      const spacesClient: SpacesClient = server.plugins.spaces.spacesClient.getScopedClient(
        request
      );

      let spaces: Space[];

      try {
        spaces = await spacesClient.getAll();
      } catch (error) {
        return wrapError(error);
      }

      return spaces;
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });

  server.route({
    method: 'GET',
    path: '/api/spaces/space/{id}',
    async handler(request: any) {
      const spaceId = request.params.id;

      const { SavedObjectsClient } = server.savedObjects;
      const spacesClient: SpacesClient = server.plugins.spaces.spacesClient.getScopedClient(
        request
      );

      try {
        return await spacesClient.get(spaceId);
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return Boom.notFound();
        }
        return wrapError(error);
      }
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
