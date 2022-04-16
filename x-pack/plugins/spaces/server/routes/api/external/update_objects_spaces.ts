/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { ExternalRouteDeps } from '.';
import { ALL_SPACES_ID } from '../../../../common/constants';
import { wrapError } from '../../../lib/errors';
import { SPACE_ID_REGEX } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

export function initUpdateObjectsSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getStartServices } = deps;

  const spacesSchema = schema.arrayOf(
    schema.string({
      validate: (value) => {
        if (value !== ALL_SPACES_ID && !SPACE_ID_REGEX.test(value)) {
          return `lower case, a-z, 0-9, "_", and "-" are allowed, OR "*"`;
        }
      },
    }),
    {
      validate: (spaceIds) => {
        if (uniq(spaceIds).length !== spaceIds.length) {
          return 'duplicate space ids are not allowed';
        }
      },
    }
  );

  externalRouter.post(
    {
      path: '/api/spaces/_update_objects_spaces',
      validate: {
        body: schema.object({
          objects: schema.arrayOf(schema.object({ type: schema.string(), id: schema.string() })),
          spacesToAdd: spacesSchema,
          spacesToRemove: spacesSchema,
        }),
      },
    },
    createLicensedRouteHandler(async (_context, request, response) => {
      const [startServices] = await getStartServices();
      const scopedClient = startServices.savedObjects.getScopedClient(request);

      const { objects, spacesToAdd, spacesToRemove } = request.body;

      try {
        const updateObjectsSpacesResponse = await scopedClient.updateObjectsSpaces(
          objects,
          spacesToAdd,
          spacesToRemove
        );
        return response.ok({ body: updateObjectsSpacesResponse });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );
}

/** Returns all unique elements of an array. */
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set<T>(arr));
}
