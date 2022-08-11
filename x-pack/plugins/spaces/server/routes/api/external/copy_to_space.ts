/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import { schema } from '@kbn/config-schema';
import type { SavedObject } from '@kbn/core/server';

import type { ExternalRouteDeps } from '.';
import {
  copySavedObjectsToSpacesFactory,
  resolveCopySavedObjectsToSpacesConflictsFactory,
} from '../../../lib/copy_to_spaces';
import { SPACE_ID_REGEX } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';

type SavedObjectIdentifier = Pick<SavedObject, 'id' | 'type'>;

const areObjectsUnique = (objects: SavedObjectIdentifier[]) =>
  _.uniqBy(objects, (o: SavedObjectIdentifier) => `${o.type}:${o.id}`).length === objects.length;

export function initCopyToSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getSpacesService, usageStatsServicePromise, getStartServices } = deps;
  const usageStatsClientPromise = usageStatsServicePromise.then(({ getClient }) => getClient());

  externalRouter.post(
    {
      path: '/api/spaces/_copy_saved_objects',
      options: {
        tags: ['access:copySavedObjectsToSpaces'],
      },
      validate: {
        body: schema.object(
          {
            spaces: schema.arrayOf(
              schema.string({
                validate: (value) => {
                  if (!SPACE_ID_REGEX.test(value)) {
                    return `lower case, a-z, 0-9, "_", and "-" are allowed`;
                  }
                },
              }),
              {
                validate: (spaceIds) => {
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
                validate: (objects) => {
                  if (!areObjectsUnique(objects)) {
                    return 'duplicate objects are not allowed';
                  }
                },
              }
            ),
            includeReferences: schema.boolean({ defaultValue: false }),
            overwrite: schema.boolean({ defaultValue: false }),
            createNewCopies: schema.boolean({ defaultValue: true }),
          },
          {
            validate: (object) => {
              if (object.overwrite && object.createNewCopies) {
                return 'cannot use [overwrite] with [createNewCopies]';
              }
            },
          }
        ),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const [startServices] = await getStartServices();
      const {
        spaces: destinationSpaceIds,
        objects,
        includeReferences,
        overwrite,
        createNewCopies,
      } = request.body;

      const { headers } = request;
      usageStatsClientPromise.then((usageStatsClient) =>
        usageStatsClient.incrementCopySavedObjects({ headers, createNewCopies, overwrite })
      );

      const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
        startServices.savedObjects,
        request
      );
      const sourceSpaceId = getSpacesService().getSpaceId(request);
      const copyResponse = await copySavedObjectsToSpaces(sourceSpaceId, destinationSpaceIds, {
        objects,
        includeReferences,
        overwrite,
        createNewCopies,
      });
      return response.ok({ body: copyResponse });
    })
  );

  externalRouter.post(
    {
      path: '/api/spaces/_resolve_copy_saved_objects_errors',
      options: {
        tags: ['access:copySavedObjectsToSpaces'],
      },
      validate: {
        body: schema.object({
          retries: schema.recordOf(
            schema.string({
              validate: (spaceId) => {
                if (!SPACE_ID_REGEX.test(spaceId)) {
                  return `Invalid space id: ${spaceId}`;
                }
              },
            }),
            schema.arrayOf(
              schema.object({
                type: schema.string(),
                id: schema.string(),
                overwrite: schema.boolean({ defaultValue: false }),
                destinationId: schema.maybe(schema.string()),
                createNewCopy: schema.maybe(schema.boolean()),
                ignoreMissingReferences: schema.maybe(schema.boolean()),
              })
            )
          ),
          objects: schema.arrayOf(
            schema.object({
              type: schema.string(),
              id: schema.string(),
            }),
            {
              validate: (objects) => {
                if (!areObjectsUnique(objects)) {
                  return 'duplicate objects are not allowed';
                }
              },
            }
          ),
          includeReferences: schema.boolean({ defaultValue: false }),
          createNewCopies: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const [startServices] = await getStartServices();
      const { objects, includeReferences, retries, createNewCopies } = request.body;

      const { headers } = request;
      usageStatsClientPromise.then((usageStatsClient) =>
        usageStatsClient.incrementResolveCopySavedObjectsErrors({ headers, createNewCopies })
      );

      const resolveCopySavedObjectsToSpacesConflicts =
        resolveCopySavedObjectsToSpacesConflictsFactory(startServices.savedObjects, request);
      const sourceSpaceId = getSpacesService().getSpaceId(request);
      const resolveConflictsResponse = await resolveCopySavedObjectsToSpacesConflicts(
        sourceSpaceId,
        {
          objects,
          includeReferences,
          retries,
          createNewCopies,
        }
      );
      return response.ok({ body: resolveConflictsResponse });
    })
  );
}
