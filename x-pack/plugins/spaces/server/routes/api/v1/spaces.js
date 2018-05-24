/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit } from 'lodash';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { spaceSchema } from '../../../lib/space_schema';
import { wrapError } from '../../../lib/errors';
import { isReservedSpace } from '../../../../common/is_reserved_space';
import { createDuplicateContextQuery } from '../../../lib/check_duplicate_context';
import { setSelectedSpace } from '../../../lib/selected_space_state';
import { addSpaceUrlContext } from '../../../../common';

export function initSpacesApi(server) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  function convertSavedObjectToSpace(savedObject) {
    return {
      id: savedObject.id,
      ...savedObject.attributes
    };
  }

  const callWithInternalUser = getClient(server).callWithInternalUser;

  const config = server.config();

  async function checkForDuplicateContext(space) {
    const query = createDuplicateContextQuery(config.get('kibana.index'), space);

    // TODO(legrego): Once the SOC is split into a client & repository, this "callWithInternalUser" call should
    // be replaced to use the repository instead.
    const { hits } = await callWithInternalUser('search', query);

    const { total, hits: conflicts } = hits;

    let error;

    if (total > 0) {
      const firstConflictName = conflicts[0]._source.space.name;

      error = Boom.badRequest(
        `Another Space (${firstConflictName}) already uses this URL Context. Please choose a different URL Context.`
      );
    }

    return { error };
  }

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

        spaces = result.saved_objects.map(convertSavedObjectToSpace);
      } catch (e) {
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
    path: '/api/spaces/v1/space/{id}',
    async handler(request, reply) {
      const spaceId = request.params.id;

      const client = request.getSavedObjectsClient();

      try {
        const response = await client.get('space', spaceId);

        return reply(convertSavedObjectToSpace(response));
      } catch (e) {
        return reply(wrapError(e));
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
      const client = request.getSavedObjectsClient();

      const {
        overwrite = false
      } = request.query;

      const space = omit(request.payload, ['id', '_reserved']);

      const { error } = await checkForDuplicateContext(space);

      if (error) {
        return reply(wrapError(error));
      }

      const id = request.params.id;

      let result;
      try {
        const existingSpace = await getSpaceById(client, id);

        // Reserved Spaces cannot have their _reserved or urlContext properties altered.
        if (isReservedSpace(existingSpace)) {
          space._reserved = true;
          space.urlContext = existingSpace.urlContext;
        }

        result = await client.create('space', { ...space }, { id, overwrite });
      } catch (e) {
        return reply(wrapError(e));
      }

      return reply(convertSavedObjectToSpace(result));
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/spaces/v1/space/{id}',
    async handler(request, reply) {
      const client = request.getSavedObjectsClient();

      const {
        overwrite = false
      } = request.query;

      const space = omit(request.payload, ['id']);
      const id = request.params.id;

      const { error } = await checkForDuplicateContext({ ...space, id });

      if (error) {
        return reply(wrapError(error));
      }

      let result;
      try {
        result = await client.create('space', { ...space }, { id, overwrite });
      } catch (e) {
        return reply(wrapError(e));
      }

      return reply(convertSavedObjectToSpace(result));
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
      const client = request.getSavedObjectsClient();

      const id = request.params.id;

      let result;

      try {
        const existingSpace = await getSpaceById(client, id);
        if (isReservedSpace(existingSpace)) {
          return reply(wrapError(Boom.badRequest('This Space cannot be deleted because it is reserved.')));
        }

        result = await client.delete('space', id);
      } catch (e) {
        return reply(wrapError(e));
      }

      return reply(result).code(204);
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/spaces/v1/space/{id}/select',
    async handler(request, reply) {
      const client = request.getSavedObjectsClient();

      const id = request.params.id;

      try {
        const existingSpace = await getSpaceById(client, id);

        setSelectedSpace(request, reply, existingSpace.urlContext);
        const config = server.config();

        return reply({
          location: addSpaceUrlContext(config.get('server.basePath'), existingSpace.urlContext)
        });

      } catch (e) {
        return reply(wrapError(e));
      }
    }
  });

  async function getSpaceById(client, spaceId) {
    try {
      const existingSpace = await client.get('space', spaceId);
      console.log(existingSpace);
      return {
        id: existingSpace.id,
        ...existingSpace.attributes
      };
    } catch (e) {
      if (client.errors.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }
}
