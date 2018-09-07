/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from '../../../lib/errors';
import { spaceSchema } from '../../../lib/space_schema';
import { SpacesClient } from '../../../lib/spaces_client';
import { getSpaceById } from '../../lib';

export function initPostSpacesApi(server: any, routePreCheckLicenseFn: any) {
  server.route({
    method: 'POST',
    path: '/api/spaces/space',
    async handler(request: any, reply: any) {
      const { SavedObjectsClient } = server.savedObjects;
      const spacesClient: SpacesClient = server.plugins.spaces.spacesClient.getScopedClient(
        request
      );

      const space = request.payload;

      const id = request.payload.id;

      const existingSpace = await getSpaceById(spacesClient, id, SavedObjectsClient.errors);
      if (existingSpace) {
        return reply(
          Boom.conflict(
            `A space with the identifier ${id} already exists. Please choose a different identifier`
          )
        );
      }

      try {
        return reply(await spacesClient.create({ ...space }));
      } catch (error) {
        return reply(wrapError(error));
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
