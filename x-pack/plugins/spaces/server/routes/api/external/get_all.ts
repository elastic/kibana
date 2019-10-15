/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { ExternalRouteDeps } from '.';
import { createLicensedRouteHandler } from '../../lib';

export function initGetAllSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, log, spacesService } = deps;

  externalRouter.get(
    {
      path: '/api/spaces/space',
      validate: {
        query: schema.object({
          purpose: schema.oneOf(
            [schema.literal('any'), schema.literal('copySavedObjectsIntoSpace')],
            {
              defaultValue: 'any',
            }
          ),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      log.debug(`Inside GET /api/spaces/space`);

      const purpose = request.query.purpose;

      const spacesClient = await spacesService.scopedClient(request);

      let spaces: Space[];

      try {
        log.debug(`Attempting to retrieve all spaces for ${purpose} purpose`);
        spaces = await spacesClient.getAll(purpose);
        log.debug(`Retrieved ${spaces.length} spaces for ${purpose} purpose`);
      } catch (error) {
        log.debug(`Error retrieving spaces for ${purpose} purpose: ${error}`);
        return response.customError(wrapError(error));
      }

      return response.ok({ body: spaces });
    })
  );
}
