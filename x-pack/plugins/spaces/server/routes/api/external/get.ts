/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Space } from '../../../../common/model/space';
import { GetSpacePurpose } from '../../../../common/model/types';
import { wrapError } from '../../../lib/errors';
import { SpacesClient } from '../../../lib/spaces_client';
import { ExternalRouteDeps } from '.';

export function initGetSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, log, spacesService, getSavedObjects } = deps;

  externalRouter.get(
    {
      path: '/api/spaces/space',
      validate: {
        query: schema.object({
          purpose: schema.maybe(
            schema.oneOf([schema.literal('any'), schema.literal('copySavedObjectsIntoSpace')], {
              defaultValue: 'any',
            })
          ),
        }),
      },
    },
    async (context, request, response) => {
      log.debug(`Inside GET /api/spaces/space`);

      const purpose = request.query.purpose as GetSpacePurpose;

      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

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
    }
  );

  externalRouter.get(
    {
      path: '/api/spaces/space/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const spaceId = request.params.id;

      const { SavedObjectsClient } = getSavedObjects();
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      try {
        const space = await spacesClient.get(spaceId);
        return response.ok({ body: space });
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return response.notFound();
        }
        return response.customError(wrapError(error));
      }
    }
  );
}
