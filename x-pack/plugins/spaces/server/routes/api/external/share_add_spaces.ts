/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../../../lib/errors';
import { ExternalRouteDeps } from '.';
import { SPACE_ID_REGEX } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

export function initShareAddSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getSavedObjects } = deps;

  externalRouter.post(
    {
      path: '/api/spaces/_share_saved_object_add',
      options: {
        tags: ['access:shareSavedObjectsToSpacesAdd'],
      },
      validate: {
        body: schema.object({
          spaces: schema.arrayOf(
            schema.string({
              validate: value => {
                if (!SPACE_ID_REGEX.test(value)) {
                  return `lower case, a-z, 0-9, "_", and "-" are allowed`;
                }
              },
            }),
            {
              validate: spaceIds => {
                if (!spaceIds.length) {
                  return 'must specify one or more space ids';
                } else if (_.uniq(spaceIds).length !== spaceIds.length) {
                  return 'duplicate space ids are not allowed';
                }
              },
            }
          ),
          object: schema.object({
            type: schema.string(),
            id: schema.string(),
          }),
        }),
      },
    },
    createLicensedRouteHandler(async (_context, request, response) => {
      const { SavedObjectsClient, getScopedSavedObjectsClient } = getSavedObjects();
      const scopedClient = getScopedSavedObjectsClient(request);

      const spaces = request.body.spaces;
      const { type, id } = request.body.object;

      try {
        scopedClient.addNamespaces(type, id, spaces);
      } catch (error) {
        if (SavedObjectsClient.errors.isNotFoundError(error)) {
          return response.notFound();
        } else if (SavedObjectsClient.errors.isBadRequestError(error)) {
          return response.badRequest();
        }
        return response.customError(wrapError(error));
      }
      return response.noContent();
    })
  );
}
