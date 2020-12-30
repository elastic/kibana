/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '../../../../../../../src/core/server';
import { Space } from '../../../../common/model/space';
import { wrapError } from '../../../lib/errors';
import { spaceSchema } from '../../../lib/space_schema';
import { ExternalRouteDeps } from '.';
import { createLicensedRouteHandler } from '../../lib';

export function initPutSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getSpacesService } = deps;

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
      const spacesClient = getSpacesService().createSpacesClient(request);

      const space = request.body;
      const id = request.params.id;

      let result: Space;
      try {
        result = await spacesClient.update(id, { ...space });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
          return response.notFound();
        }
        return response.customError(wrapError(error));
      }

      return response.ok({ body: result });
    })
  );
}
