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
  const {
    router,
    getSpacesService,
    usageStatsServicePromise,
    getStartServices,
    log,
    isServerless,
  } = deps;
  const usageStatsClientPromise = usageStatsServicePromise.then(({ getClient }) => getClient());

  router.post(
    {
      path: '/api/spaces/_copy_saved_objects',
      security: {
        authz: {
          requiredPrivileges: ['copySavedObjectsToSpaces'],
        },
      },
      options: {
        access: isServerless ? 'internal' : 'public',
        tags: ['oas-tag:spaces'],
        summary: `Copy saved objects between spaces`,
        description:
          'It also allows you to automatically copy related objects, so when you copy a dashboard, this can automatically copy over the associated visualizations, data views, and saved searches, as required. You can request to overwrite any objects that already exist in the target space if they share an identifier or you can use the resolve copy saved objects conflicts API to do this on a per-object basis.',
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
                meta: {
                  description:
                    'The identifiers of the spaces where you want to copy the specified objects.',
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
                type: schema.string({
                  meta: { description: 'The type of the saved object to copy.' },
                }),
                id: schema.string({
                  meta: { description: 'The identifier of the saved object to copy.' },
                }),
              }),
              {
                validate: (objects) => {
                  if (!areObjectsUnique(objects)) {
                    return 'duplicate objects are not allowed';
                  }
                },
              }
            ),
            includeReferences: schema.boolean({
              defaultValue: false,
              meta: {
                description:
                  'When set to true, all saved objects related to the specified saved objects will also be copied into the target spaces.',
              },
            }),
            overwrite: schema.boolean({
              defaultValue: false,
              meta: {
                description:
                  'When set to true, all conflicts are automatically overridden. When a saved object with a matching type and identifier exists in the target space, that version is replaced with the version from the source space. This option cannot be used with the `createNewCopies` option.',
              },
            }),
            createNewCopies: schema.boolean({
              defaultValue: true,
              meta: {
                description:
                  'Create new copies of saved objects, regenerate each object identifier, and reset the origin. When used, potential conflict errors are avoided.  This option cannot be used with the `overwrite` and `compatibilityMode` options.',
              },
            }),
            compatibilityMode: schema.boolean({
              defaultValue: false,
              meta: {
                description:
                  'Apply various adjustments to the saved objects that are being copied to maintain compatibility between different Kibana versions. Use this option only if you encounter issues with copied saved objects. This option cannot be used with the `createNewCopies` option.',
              },
            }),
          },
          {
            validate: (object) => {
              if (object.overwrite && object.createNewCopies) {
                return 'cannot use [overwrite] with [createNewCopies]';
              }
              if (object.compatibilityMode && object.createNewCopies) {
                return 'cannot use [compatibilityMode] with [createNewCopies]';
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
        compatibilityMode,
      } = request.body;

      const { headers } = request;
      usageStatsClientPromise
        .then((usageStatsClient) =>
          usageStatsClient.incrementCopySavedObjects({
            headers,
            createNewCopies,
            overwrite,
            compatibilityMode,
          })
        )
        .catch((err) => {
          log.error(
            `Failed to report usage statistics for the copy saved objects route: ${err.message}`
          );
        });

      try {
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
          compatibilityMode,
        });
        return response.ok({ body: copyResponse });
      } catch (e) {
        if (e.type === 'object-fetch-error' && e.attributes?.objects) {
          return response.notFound({
            body: {
              message: 'Saved objects not found',
              attributes: {
                objects: e.attributes?.objects.map((obj: SavedObjectIdentifier) => ({
                  id: obj.id,
                  type: obj.type,
                })),
              },
            },
          });
        } else throw e;
      }
    })
  );

  router.post(
    {
      path: '/api/spaces/_resolve_copy_saved_objects_errors',
      security: {
        authz: {
          requiredPrivileges: ['copySavedObjectsToSpaces'],
        },
      },
      options: {
        access: isServerless ? 'internal' : 'public',

        summary: `Resolve conflicts copying saved objects`,
        description:
          'Overwrite saved objects that are returned as errors from the copy saved objects to space API.',
      },
      validate: {
        body: schema.object(
          {
            retries: schema.recordOf(
              schema.string({
                meta: {
                  description:
                    'The retry operations to attempt, which can specify how to resolve different types of errors. Object keys represent the target space identifiers.',
                },
                validate: (spaceId) => {
                  if (!SPACE_ID_REGEX.test(spaceId)) {
                    return `Invalid space id: ${spaceId}`;
                  }
                },
              }),
              schema.arrayOf(
                schema.object({
                  type: schema.string({ meta: { description: 'The saved object type.' } }),
                  id: schema.string({ meta: { description: 'The saved object identifier.' } }),
                  overwrite: schema.boolean({
                    defaultValue: false,
                    meta: {
                      description:
                        'When set to true, the saved object from the source space overwrites the conflicting object in the destination space.',
                    },
                  }),
                  destinationId: schema.maybe(
                    schema.string({
                      meta: {
                        description:
                          'Specifies the destination identifier that the copied object should have, if different from the current identifier.',
                      },
                    })
                  ),
                  createNewCopy: schema.maybe(
                    schema.boolean({
                      meta: {
                        description:
                          'Creates new copies of the saved objects, regenerates each object ID, and resets the origin.',
                      },
                    })
                  ),
                  ignoreMissingReferences: schema.maybe(
                    schema.boolean({
                      meta: {
                        description: 'When set to true, any missing references errors are ignored.',
                      },
                    })
                  ),
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
            compatibilityMode: schema.boolean({ defaultValue: false }),
          },
          {
            validate: (object) => {
              if (object.createNewCopies && object.compatibilityMode) {
                return 'cannot use [createNewCopies] with [compatibilityMode]';
              }
            },
          }
        ),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const [startServices] = await getStartServices();
      const { objects, includeReferences, retries, createNewCopies, compatibilityMode } =
        request.body;

      const { headers } = request;
      usageStatsClientPromise
        .then((usageStatsClient) =>
          usageStatsClient.incrementResolveCopySavedObjectsErrors({
            headers,
            createNewCopies,
            compatibilityMode,
          })
        )
        .catch((err) => {
          log.error(
            `Failed to report usage statistics for the resolve copy saved objects errors route: ${err.message}`
          );
        });

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
          compatibilityMode,
        }
      );
      return response.ok({ body: resolveConflictsResponse });
    })
  );
}
