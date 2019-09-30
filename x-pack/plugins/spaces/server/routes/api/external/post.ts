/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { spaceSchema } from '../../../lib/space_schema';
import { SpacesClient } from '../../../lib/spaces_client';
import { ExternalRouteDeps } from '.';
import { createLicensedRouteHandler } from '../../lib';

export function initPostSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, log, spacesService, getSavedObjects } = deps;

  externalRouter.post(
    {
      path: '/api/spaces/space',
      validate: {
        body: spaceSchema,
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      log.debug(`Inside POST /api/spaces/space`);
      const { SavedObjectsClient } = getSavedObjects();
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      const space = request.body as Space;

      try {
        log.debug(`Attempting to create space`);
        const createdSpace = await spacesClient.create(space);
        return response.ok({ body: createdSpace });
      } catch (error) {
        if (SavedObjectsClient.errors.isConflictError(error)) {
          const { body } = wrapError(
            Boom.conflict(`A space with the identifier ${space.id} already exists.`)
          );
          return response.conflict({ body });
        }
        log.debug(`Error creating space: ${error}`);
        return response.customError(wrapError(error));
      }
    })
  );
}
