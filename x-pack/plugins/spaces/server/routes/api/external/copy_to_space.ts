/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { Legacy } from 'kibana';
import { SpacesClient } from '../../../lib/spaces_client';
import { copySavedObjectsToSpacesFactory } from '../../../lib/copy_to_spaces';

interface CopyPayload {
  spaces: string[];
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  overwrite: boolean;
}

export function initCopyToSpacesApi(server: Legacy.Server, routePreCheckLicenseFn: any) {
  server.route({
    method: 'POST',
    path: '/api/spaces/copySavedObjects',
    async handler(request: Legacy.Request, h: Legacy.ResponseToolkit) {
      const spacesClient = server.plugins.spaces.spacesClient;
      const scopedSpacesClient: SpacesClient = spacesClient.getScopedClient(request);

      const savedObjectsClient = request.getSavedObjectsClient();

      const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
        scopedSpacesClient,
        savedObjectsClient,
        server.savedObjects
      );

      const { spaces, objects, includeReferences, overwrite } = request.payload as CopyPayload;

      const copyResponse = await copySavedObjectsToSpaces(spaces, {
        objects,
        includeReferences,
        overwrite,
      });

      return h.response(copyResponse);
    },
    options: {
      validate: {
        payload: {
          spaces: Joi.array()
            .items(Joi.string())
            .unique(),
          objects: Joi.array()
            .items(Joi.object({ type: Joi.string(), id: Joi.string() }))
            .unique(),
          includeReferences: Joi.bool().default(false),
          overwrite: Joi.bool().default(false),
        },
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
