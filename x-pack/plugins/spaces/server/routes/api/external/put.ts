/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { spaceSchema } from '../../../lib/space_schema';
import { SpacesClient } from '../../../lib/spaces_client';
import { ExternalRouteDeps } from '.';
import { createLicensedRouteHandler } from '../../lib';

export function initPutSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, spacesService, getSavedObjects } = deps;

  externalRouter.put(
    {
      path: '/api/spaces/space/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: spaceSchema,
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { SavedObjectsClient } = getSavedObjects();
      const spacesClient: SpacesClient = await spacesService.scopedClient(request);

      const space = request.body as Space;
      const id = request.params.id;

      let result: Space;
      try {
        result = await spacesClient.update(id, { ...space });
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return response.notFound();
        }
        return response.customError(wrapError(error));
      }

      return response.ok({ body: result });
    })
  );
}
