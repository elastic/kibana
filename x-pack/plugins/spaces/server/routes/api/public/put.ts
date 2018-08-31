/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit } from 'lodash';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { spaceSchema } from '../../../lib/space_schema';
import { convertSavedObjectToSpace, getSpaceById } from '../../lib';

export function initPutSpacesApi(server: any) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'PUT',
    path: '/api/spaces/space/{id}',
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
        payload: spaceSchema,
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
