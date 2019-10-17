/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';
import { ExternalRouteDeps } from '.';
import { createLicensedRouteHandler } from '../../lib';

export function initDeleteSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getSavedObjects, spacesService } = deps;

  externalRouter.delete(
    {
      path: '/api/spaces/space/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { SavedObjectsClient } = getSavedObjects();
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      const id = request.params.id;

      try {
        await spacesClient.delete(id);
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return response.notFound();
        }
        return response.customError(wrapError(error));
      }

      return response.noContent();
    })
  );
}
