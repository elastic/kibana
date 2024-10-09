/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { ExternalRouteDeps } from '.';
import { API_VERSIONS } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { getSpaceSchema } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

export function initPostSpacesApi(deps: ExternalRouteDeps) {
  const { router, log, getSpacesService, isServerless } = deps;

  router.versioned
    .post({
      path: '/api/spaces/space',
      access: 'public',
      description: `Create a space`,
      options: {
        tags: ['oas-tag:spaces'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: getSpaceSchema(isServerless),
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        log.debug(`Inside POST /api/spaces/space`);
        const spacesClient = getSpacesService().createSpacesClient(request);
        const space = request.body;
        try {
          log.debug(`Attempting to create space`);
          const createdSpace = await spacesClient.create(space);
          return response.ok({ body: createdSpace });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isConflictError(error)) {
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
