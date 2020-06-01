/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerGetAllRoute({ router, license, lib: { isEsError } }: RouteDependencies) {
  // Get all component templates
  router.get(
    { path: addBasePath('/component_templates'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      try {
        const response = await callAsCurrentUser('dataManagement.getComponentTemplates');

        return res.ok({ body: response.component_templates });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );

  // Get single component template
  router.get(
    {
      path: addBasePath('/component_templates/{name}'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const { name } = req.params;

      try {
        const { component_templates: componentTemplates } = await callAsCurrentUser(
          'dataManagement.getComponentTemplates',
          {
            name,
          }
        );

        return res.ok({
          body: {
            ...componentTemplates[0],
            name,
          },
        });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
}
