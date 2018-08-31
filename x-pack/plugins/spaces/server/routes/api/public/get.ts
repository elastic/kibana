/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { wrapError } from '../../../lib/errors';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { convertSavedObjectToSpace } from '../../lib';

export function initGetSpacesApi(server: any) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'GET',
    path: '/api/spaces/space',
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
      pre: [routePreCheckLicenseFn],
    },
  });

  server.route({
    method: 'GET',
    path: '/api/spaces/space/{id}',
    async handler(request: any, reply: any) {
      const spaceId = request.params.id;

      const client = request.getSavedObjectsClient();

      try {
        const response = await client.get('space', spaceId);

        return reply(convertSavedObjectToSpace(response));
      } catch (error) {
        if (client.errors.isNotFoundError(error)) {
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
