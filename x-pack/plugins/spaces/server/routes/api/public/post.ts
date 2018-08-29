/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit } from 'lodash';
import { wrapError } from '../../../lib/errors';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { spaceSchema } from '../../../lib/space_schema';
import { getSpaceById } from '../../lib';

export function initPostSpacesApi(server: any) {
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  server.route({
    method: 'POST',
    path: '/api/spaces',
    async handler(request: any, reply: any) {
      const client = request.getSavedObjectsClient();

      const space = omit(request.payload, ['id', '_reserved']);

      const id = request.payload.id;

      const existingSpace = await getSpaceById(client, id);
      if (existingSpace) {
        return reply(
          Boom.conflict(
            `A space with the identifier ${id} already exists. Please choose a different identifier`
          )
        );
      }

      try {
        return reply(await client.create('space', { ...space }, { id, overwrite: false }));
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
