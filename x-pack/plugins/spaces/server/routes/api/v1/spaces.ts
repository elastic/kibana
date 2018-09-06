/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { addSpaceIdToPath } from '../../../lib/spaces_url_parser';
import { getSpaceById } from '../../lib';

export function initPrivateSpacesApi(server: any, routePreCheckLicenseFn: any) {
  server.route({
    method: 'POST',
    path: '/api/spaces/v1/space/{id}/select',
    async handler(request: any, reply: any) {
      const client = request.getSavedObjectsClient();

      const id = request.params.id;

      try {
        const existingSpace: Space | null = await getSpaceById(client, id);
        if (!existingSpace) {
          return reply(Boom.notFound());
        }

        const config = server.config();

        return reply({
          location: addSpaceIdToPath(
            config.get('server.basePath'),
            existingSpace.id,
            config.get('server.defaultRoute')
          ),
        });
      } catch (error) {
        return reply(wrapError(error));
      }
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
