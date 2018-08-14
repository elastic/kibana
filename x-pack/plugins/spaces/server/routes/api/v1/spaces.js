/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { spaceSchema } from '../../../lib/space_schema';
import { wrapError } from '../../../lib/errors';
import { addSpaceIdToPath } from '../../../lib/spaces_url_parser';

export function initSpacesApi(server) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'GET',
    path: '/api/spaces/v1/spaces',
    async handler(request, reply) {

      const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);

      try {
        const spaces = await spacesClient.getAll();
        return reply(spaces);
      } catch (error) {
        return reply(wrapError(error));
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/spaces/v1/space/{id}',
    async handler(request, reply) {
      const spaceId = request.params.id;

      const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);

      try {
        const space = await spacesClient.get(spaceId);

        return reply(space);
      } catch (error) {
        return reply(wrapError(error));
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'POST',
    path: '/api/spaces/v1/space',
    async handler(request, reply) {
      const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
      const space = request.payload;

      try {
        return reply(await spacesClient.create(space));
      } catch (error) {
        return reply(wrapError(error));
      }

    },
    config: {
      validate: {
        payload: spaceSchema
      },
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/spaces/v1/space/{id}',
    async handler(request, reply) {
      const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
      const space = request.payload;
      const id = request.params.id;

      try {
        const response = spacesClient.update(id, space);
        return reply(response);
      } catch (error) {
        return reply(wrapError(error));
      }
    },
    config: {
      validate: {
        payload: spaceSchema
      },
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'DELETE',
    path: '/api/spaces/v1/space/{id}',
    async handler(request, reply) {
      const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
      const id = request.params.id;

      try {
        await spacesClient.delete(id);
        return reply().code(204);
      } catch (error) {
        return reply(wrapError(error));
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'POST',
    path: '/api/spaces/v1/space/{id}/select',
    async handler(request, reply) {
      const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
      const id = request.params.id;

      try {
        const space = await spacesClient.get(id);

        const config = server.config();

        return reply({
          location: addSpaceIdToPath(config.get('server.basePath'), space.id, config.get('server.defaultRoute'))
        });

      } catch (error) {
        return reply(wrapError(error));
      }
    }
  });
}
