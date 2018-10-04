/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';

export function initGetSpacesApi(server: any, routePreCheckLicenseFn: any) {
  server.route({
    method: 'GET',
    path: '/api/spaces/space',
    async handler(request: any, reply: any) {
      const spacesClient: SpacesClient = server.plugins.spaces.spacesClient.getScopedClient(
        request
      );

      let spaces: Space[];

      try {
        spaces = await spacesClient.getAll();
      } catch (error) {
        return reply(wrapError(error));
      }

      return reply(spaces);
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });

  server.route({
    method: 'GET',
    path: '/api/spaces/space/{id}',
    async handler(request: any, reply: any) {
      const spaceId = request.params.id;

      const { SavedObjectsClient } = server.savedObjects;
      const spacesClient: SpacesClient = server.plugins.spaces.spacesClient.getScopedClient(
        request
      );

      try {
        return reply(await spacesClient.get(spaceId));
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return reply(Boom.notFound());
        }
        return reply(wrapError(error));
      }
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
