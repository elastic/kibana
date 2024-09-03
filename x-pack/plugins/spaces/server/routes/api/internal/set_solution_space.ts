/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { InternalRouteDeps } from '.';
import type { SolutionView, Space } from '../../../../common';
import { wrapError } from '../../../lib/errors';
import { solutionSchema } from '../../../lib/space_schema';
import { createLicensedRouteHandler, isValidSpaceSolution, parseCloudSolution } from '../../lib';

const spaceSolutionSchema = schema.object({
  solution_type: schema.maybe(
    schema.oneOf([
      schema.literal('security'),
      schema.literal('observability'),
      schema.literal('elasticsearch'),
    ])
  ),
  solution: schema.maybe(solutionSchema),
});

/* FUTURE Engineer
 * This route /internal/spaces/space/{id}/solution is and will be used by cloud (control panel)
 * to set the solution of a default space for an instant deployment
 * and it will use the parameter "solution_type"
 */

export function initSetSolutionSpaceApi(deps: InternalRouteDeps) {
  const { router, getSpacesService } = deps;

  router.put(
    {
      path: '/internal/spaces/space/{id}/solution',
      options: {
        description: `Update solution for a space`,
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: spaceSolutionSchema,
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const spacesClient = (await getSpacesService()).createSpacesClient(request);

      const id = request.params.id;
      const { solution, solution_type: solutionType } = request.body;

      if (solution && solutionType) {
        return response.customError(
          wrapError(
            Boom.badRequest(`Can not have solution and solution_type parameter defined together`)
          )
        );
      }
      let solutionToUpdate: SolutionView | undefined = solution;
      if (!solutionToUpdate) {
        solutionToUpdate = parseCloudSolution(solutionType);
      }
      if (!isValidSpaceSolution(solutionToUpdate)) {
        return response.customError(
          wrapError(
            Boom.badRequest(`One of solution and solution_type parameter need to be defined`)
          )
        );
      }

      let result: Space;
      try {
        const space = await spacesClient?.get(id);
        result = await spacesClient.update(id, { ...space, solution: solutionToUpdate });
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
