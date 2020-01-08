/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../../../lib/errors';
import { ExternalRouteDeps } from '.';
import { createLicensedRouteHandler } from '../../lib';

export function initGetSpaceApi(deps: ExternalRouteDeps) {
  const { externalRouter, spacesService, getSavedObjects } = deps;

  externalRouter.get(
    {
      path: '/api/spaces/space/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const spaceId = request.params.id;

      const { SavedObjectsClient } = getSavedObjects();
      const spacesClient = await spacesService.scopedClient(request);

      try {
        const space = await spacesClient.get(spaceId);
        return response.ok({ body: space });
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return response.notFound();
        }
        return response.customError(wrapError(error));
      }
    })
  );
}
