/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';
import { addSpaceIdToPath } from '../../../lib/spaces_url_parser';
import { getSpaceById } from '../../lib';
import { InternalRouteDeps } from '.';

export function initInternalSpacesApi(deps: InternalRouteDeps) {
  deps.internalRouter.post(
    {
      path: '/api/spaces/v1/space/{id}/select',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { spacesService, getLegacyAPI, serverBasePath } = deps;

      const { savedObjects, legacyConfig } = getLegacyAPI();

      const { SavedObjectsClient } = savedObjects;
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);
      const id = request.params.id;

      const defaultRoute = legacyConfig.serverDefaultRoute;
      try {
        const existingSpace: Space | null = await getSpaceById(
          spacesClient,
          id,
          SavedObjectsClient.errors
        );
        if (!existingSpace) {
          return response.notFound();
        }

        return response.ok({
          body: {
            location: addSpaceIdToPath(serverBasePath, existingSpace.id, defaultRoute),
          },
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
