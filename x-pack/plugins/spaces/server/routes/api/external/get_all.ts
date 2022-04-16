/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { ExternalRouteDeps } from '.';
import type { Space } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

export function initGetAllSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, log, getSpacesService } = deps;

  externalRouter.get(
    {
      path: '/api/spaces/space',
      validate: {
        query: schema.object({
          purpose: schema.maybe(
            schema.oneOf([
              schema.literal('any'),
              schema.literal('copySavedObjectsIntoSpace'),
              schema.literal('shareSavedObjectsIntoSpace'),
            ])
          ),
          include_authorized_purposes: schema.conditional(
            schema.siblingRef('purpose'),
            schema.string(),
            schema.maybe(schema.literal(false)),
            schema.maybe(schema.boolean())
          ),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      log.debug(`Inside GET /api/spaces/space`);

      const { purpose, include_authorized_purposes: includeAuthorizedPurposes } = request.query;

      const spacesClient = getSpacesService().createSpacesClient(request);

      let spaces: Space[];

      try {
        log.debug(
          `Attempting to retrieve all spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}`
        );
        spaces = await spacesClient.getAll({ purpose, includeAuthorizedPurposes });
        log.debug(
          `Retrieved ${spaces.length} spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}`
        );
      } catch (error) {
        log.debug(
          `Error retrieving spaces for ${purpose} purpose with includeAuthorizedPurposes=${includeAuthorizedPurposes}: ${error}`
        );
        return response.customError(wrapError(error));
      }

      return response.ok({ body: spaces });
    })
  );
}
