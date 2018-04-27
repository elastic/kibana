/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { spaceSchema } from '../../../lib/space_schema';
import { wrapError } from '../../../lib/errors';

export function initSpacesApi(server) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'GET',
    path: '/api/spaces/v1/spaces',
    async handler(request, reply) {
      const client = request.getSavedObjectsClient();

      let spaces;

      try {
        const result = await client.find({
          type: 'space'
        });

        spaces = result.saved_objects.map(space => ({
          ...space.attributes,
          id: space.id
        }));
      } catch(e) {
        return reply(wrapError(e));
      }

      return reply(spaces);
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/spaces/v1/spaces/{id}',
    async handler(request, reply) {
      const id = request.params.id;

      const client = request.getSavedObjectsClient();

      let space;
      try {
        space = await client.get('space', id);
      } catch (e) {
        return reply(wrapError(e));
      }

      return reply({
        ...space.attributes,
        id: space.id
      });
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'POST',
    path: '/api/spaces/v1/spaces/{id}',
    async handler(request, reply) {
      const client = request.getSavedObjectsClient();

      const {
        overwrite = false
      } = request.query;

      const space = omit(request.payload, ['id']);
      const id = request.params.id;

      let result;
      try {
        result = await client.create('space', { ...space }, { id, overwrite });
      } catch(e) {
        return reply(wrapError(e));
      }

      return reply(result);
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
    path: '/api/spaces/v1/spaces/{id}',
    async handler(request, reply) {
      const client = request.getSavedObjectsClient();

      const id = request.params.id;

      let result;

      try {
        result = await client.delete('space', id);
      } catch(e) {
        return reply(wrapError(e));
      }

      return reply(result).code(204);
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });
}
