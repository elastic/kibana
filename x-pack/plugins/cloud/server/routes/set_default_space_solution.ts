/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { RouteOptions } from '.';
import { createLicensedRouteHandler } from './error_handler';

const createBodySchemaV1 = schema.object({
  type: schema.oneOf([schema.literal('security'), schema.literal('oblt'), schema.literal('es')]),
});

export const setDefaultSpaceSolutionType = ({ router, getSpacesService }: RouteOptions) => {
  router.versioned
    .put({
      path: `/internal/cloud/solution`,
      access: 'internal',
      summary: 'Save solution type in default space for instant deployment',
      options: {
        tags: ['access:cloudSpaceDefaultSolution'],
      },
    })
    .addVersion(
      {
        version: '2024-08-14',
        validate: {
          request: {
            body: createBodySchemaV1,
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        const spacesClient = getSpacesService().createSpacesClient(request);
        const solution = request.body.type;
        try {
          const defaultSpace = await spacesClient?.get('default');
          await spacesClient?.update('default', { ...defaultSpace, solution });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return response.notFound();
          }
          return response.customError(error);
        }

        return response.ok();
      })
    );
};
