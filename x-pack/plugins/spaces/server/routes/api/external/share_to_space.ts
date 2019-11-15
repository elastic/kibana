/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import _ from 'lodash';
import { SavedObject } from 'src/core/server';
import { ExternalRouteDeps } from '.';
import { SPACE_ID_REGEX } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

type SavedObjectIdentifier = Pick<SavedObject, 'id' | 'type'>;

const areObjectsUnique = (objects: SavedObjectIdentifier[]) =>
  _.uniq(objects, (o: SavedObjectIdentifier) => `${o.type}:${o.id}`).length === objects.length;

export function initShareToSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getSavedObjects } = deps;

  externalRouter.post(
    {
      path: '/api/spaces/_share_saved_objects',
      options: {
        tags: ['access:shareSavedObjectsToSpaces'],
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
                if (_.uniq(spaceIds).length !== spaceIds.length) {
                  return 'duplicate space ids are not allowed';
                }
              },
            }
          ),
          objects: schema.arrayOf(
            schema.object({
              type: schema.string(),
              id: schema.string(),
            }),
            {
              validate: objects => {
                if (!areObjectsUnique(objects)) {
                  return 'duplicate objects are not allowed';
                }
              },
            }
          ),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const savedObjectsClient = getSavedObjects().getScopedSavedObjectsClient(request);
      const spaces = request.body.spaces;
      for (const object of request.body.objects) {
        savedObjectsClient.updateNamespaces(object.type, object.id, spaces);
      }

      return response.ok();
    })
  );
}
