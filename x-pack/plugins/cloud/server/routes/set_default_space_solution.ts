/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { parseOnboardingSolution } from '../../common/parse_onboarding_default_solution';
import { createLicensedRouteHandler } from './error_handler';
import { RouteOptions } from '.';

const createBodySchemaV1 = schema.object({
  solution_type: schema.oneOf([schema.literal('security'), schema.literal('observability'), schema.literal('elasticsearch')]),
});

export const setDefaultSpaceSolutionType = ({ router, getSpacesService }: RouteOptions) => {
  router.versioned
    .put({
      path: `/api/cloud/solution`,
      access: 'public',
      summary: 'Save solution type in default space for instant deployment',
      options: {
        tags: ['access:cloudSpaceDefaultSolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: createBodySchemaV1,
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        const spacesClient = (await getSpacesService()).createSpacesClient(request);
        const solution = request.body.solution_type;
        try {
          const defaultSpace = await spacesClient?.get('default');
          await spacesClient?.update('default', { ...defaultSpace, solution: parseOnboardingSolution(solution) });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return response.notFound();
          }
          throw error;
        }

        return response.ok();
      })
    );
};
