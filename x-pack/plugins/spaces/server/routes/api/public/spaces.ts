/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit } from 'lodash';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { spaceSchema } from '../../../lib/space_schema';
import { wrapError } from '../../../lib/errors';
import { isReservedSpace } from '../../../../common/is_reserved_space';
import { Space } from '../../../../common/model/space';

export function initPublicSpacesApi(server: any) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  function convertSavedObjectToSpace(savedObject: any) {
    return {
      id: savedObject.id,
      ...savedObject.attributes
    };
  }

  server.route({
    method: 'GET',
    path: '/api/spaces/',
    async handler(request: any, reply: any) {
      const client = request.getSavedObjectsClient();

      let spaces;

      try {
        const result = await client.find({
          type: 'space',
          sortField: 'name.keyword',
        });

        spaces = result.saved_objects.map(convertSavedObjectToSpace);
      } catch (error) {
        return reply(wrapError(error));
      }

      return reply(spaces);
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/spaces/{id}',
    async handler(request: any, reply: any) {
      const spaceId = request.params.id;

      const client = request.getSavedObjectsClient();

      try {
        const response = await client.get('space', spaceId);

        return reply(convertSavedObjectToSpace(response));
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
    path: '/api/spaces',
    async handler(request: any, reply: any) {
      const client = request.getSavedObjectsClient();

      const space = omit(request.payload, ['id', '_reserved']);

      const id = request.payload.id;

      const existingSpace = await getSpaceById(client, id);
      if (existingSpace) {
        return reply(Boom.conflict(`A space with the identifier ${id} already exists. Please choose a different identifier`));
      }

      try {
        return reply(await client.create('space', { ...space }, { id, overwrite: false }));
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
    path: '/api/spaces/{id}',
    async handler(request: any, reply: any) {
      const client = request.getSavedObjectsClient();

      const space: Space = omit(request.payload, ['id']);
      const id = request.params.id;

      const existingSpace = await getSpaceById(client, id);

      if (existingSpace) {
        space._reserved = existingSpace._reserved;
      } else {
        return reply(Boom.notFound(`Unable to find space with ID ${id}`));
      }

      let result;
      try {
        result = await client.update('space', id, { ...space });
      } catch (error) {
        return reply(wrapError(error));
      }

      const updatedSpace = convertSavedObjectToSpace(result);
      return reply(updatedSpace);
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
    path: '/api/spaces/{id}',
    async handler(request: any, reply: any) {
      const client = request.getSavedObjectsClient();

      const id = request.params.id;

      let result;

      try {
        const existingSpace = await getSpaceById(client, id);
        if (isReservedSpace(existingSpace)) {
          return reply(wrapError(Boom.badRequest('This Space cannot be deleted because it is reserved.')));
        }

        result = await client.delete('space', id);
      } catch (error) {
        return reply(wrapError(error));
      }

      return reply(result).code(204);
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  async function getSpaceById(client: any, spaceId: string) {
    try {
      const existingSpace = await client.get('space', spaceId);
      return {
        id: existingSpace.id,
        ...existingSpace.attributes
      };
    } catch (error) {
      if (client.errors.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }
}
