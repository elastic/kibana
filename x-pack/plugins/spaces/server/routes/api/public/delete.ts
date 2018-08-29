/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { isReservedSpace } from '../../../../common/is_reserved_space';
import { wrapError } from '../../../lib/errors';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { getSpaceById } from '../../lib';

export function initDeleteSpacesApi(server: any) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

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
          return reply(
            wrapError(Boom.badRequest('This Space cannot be deleted because it is reserved.'))
          );
        }

        result = await client.delete('space', id);
      } catch (error) {
        return reply(wrapError(error));
      }

      return reply(result).code(204);
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
