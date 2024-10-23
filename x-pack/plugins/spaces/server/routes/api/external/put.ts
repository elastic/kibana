/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { ExternalRouteDeps } from '.';
import { API_VERSIONS, type Space } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { getSpaceSchema } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

export function initPutSpacesApi(deps: ExternalRouteDeps) {
  const { router, getSpacesService, isServerless } = deps;

  router.versioned
    .put({
      path: '/api/spaces/space/{id}',
      access: 'public',
      summary: `Update a space`,
      options: {
        tags: ['oas-tag:spaces'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string({
                meta: {
                  description:
                    'The space identifier. You are unable to change the ID with the update operation.',
                },
              }),
            }),
            body: getSpaceSchema(isServerless),
          },
          response: {
            200: {
              description: 'Indicates a successful call.',
            },
          },
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
