/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from '../../../lib/errors';
import { spaceSchema } from '../../../lib/space_schema';
import { SpacesClient } from '../../../lib/spaces_client';

export function initPostSpacesApi(server: any, routePreCheckLicenseFn: any) {
  server.route({
    method: 'POST',
    path: '/api/spaces/space',
    async handler(request: any) {
      server.log(['spaces', 'debug'], `Inside POST /api/spaces/space`);
      const { SavedObjectsClient } = server.savedObjects;
      const spacesClient: SpacesClient = server.plugins.spaces.spacesClient.getScopedClient(
        request
      );

      const space = request.payload;

      try {
        server.log(['spaces', 'debug'], `Attempting to create space`);
        return await spacesClient.create(space);
      } catch (error) {
        if (SavedObjectsClient.errors.isConflictError(error)) {
          return Boom.conflict(`A space with the identifier ${space.id} already exists.`);
        }
        server.log(['spaces', 'debug'], `Error creating space: ${error}`);
        return wrapError(error);
      }
    },
    config: {
      validate: {
        payload: spaceSchema,
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
