/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { getClient } from '../../../../../../server/lib/get_client_shield';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { spaceSchema } from '../../../lib/space_schema';

import { mockSpaces } from '../../../../common/mock_spaces';

export function initSpacesApi(server) {
  const callWithRequest = getClient(server).callWithRequest; // eslint-disable-line no-unused-vars
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'GET',
    path: '/api/spaces/v1/spaces',
    handler(request, reply) {
      reply(mockSpaces);
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'GET',
    path: '/api/spaces/v1/spaces/{id}',
    handler(request, reply) {
      const id = request.params.id;
      const space = mockSpaces.find(space => space.id === id);
      reply(space || Boom.notFound());
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });

  server.route({
    method: 'POST',
    path: '/api/spaces/v1/spaces/{id}',
    handler(request, reply) {
      mockSpaces.push(request.payload);
      reply(request.payload);
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
    handler(request, reply) {
      reply().code(204);
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });
}
