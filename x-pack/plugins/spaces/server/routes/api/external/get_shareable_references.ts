/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { GetShareableReferencesResponse } from '../../../../common';
import { UNKNOWN_SPACE } from '../../../../common/constants';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';
import type { ExternalRouteDeps } from './';

const tagSavedObjectTypeName = 'tag';

export function initGetShareableReferencesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getStartServices } = deps;

  externalRouter.post(
    {
      path: '/api/spaces/_get_shareable_references',
      validate: {
        body: schema.object({
          objects: schema.arrayOf(schema.object({ type: schema.string(), id: schema.string() })),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const [startServices] = await getStartServices();
      const scopedClient = startServices.savedObjects.getScopedClient(request);

      const { objects } = request.body;

      try {
        const collectedObjects = await scopedClient.collectMultiNamespaceReferences(objects, {
          purpose: 'updateObjectsSpaces',
        });
        const requestedObjectsSet = objects.reduce(
          (acc, { type, id }) => acc.add(`${type}:${id}`),
          new Set<string>()
        );

        let tagsCount = 0;
        let relativesCount = 0;
        let unknownSpacesCount = 0;
        const selectedSpacesCountsMap = collectedObjects.objects.reduce(
          (acc, { type, id, spaces }) => {
            if (!requestedObjectsSet.has(`${type}:${id}`)) {
              if (type === tagSavedObjectTypeName) {
                tagsCount++;
              } else {
                relativesCount++;
              }
            }
            let unknown = 0;
            for (const space of spaces) {
              if (space === UNKNOWN_SPACE) {
                unknown++;
              } else {
                const val = acc.get(space) ?? 0;
                acc.set(space, val + 1);
              }
            }
            if (unknown > unknownSpacesCount) {
              unknownSpacesCount = unknown; // this isn't 100% accurate but it is good enough; approximates at least how many unknown spaces there are
            }
            return acc;
          },
          new Map<string, number>()
        );

        const selectedSpaces: string[] = [];
        const partiallySelectedSpaces: string[] = [];
        selectedSpacesCountsMap.forEach((count, space) => {
          if (count === collectedObjects.objects.length) {
            selectedSpaces.push(space);
          } else {
            partiallySelectedSpaces.push(space);
          }
        });

        const getShareableReferencesResponse: GetShareableReferencesResponse = {
          relativesCount,
          tagsCount,
          selectedSpaces,
          partiallySelectedSpaces,
          unknownSpacesCount,
          objects: collectedObjects.objects,
        };
        return response.ok({ body: getShareableReferencesResponse });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );
}
