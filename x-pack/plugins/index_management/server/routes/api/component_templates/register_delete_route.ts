/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const paramsSchema = schema.object({
  names: schema.string(),
});

export const registerDeleteRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.delete(
    {
      path: addBasePath('/component_templates/{names}'),
      validate: {
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { names } = request.params;
      const componentNames = names.split(',');

      const responseBody: { itemsDeleted: string[]; errors: any[] } = {
        itemsDeleted: [],
        errors: [],
      };

      await Promise.all(
        componentNames.map(async (componentName) => {
          try {
            await client.asCurrentUser.cluster.deleteComponentTemplate({
              name: componentName,
            });

            return responseBody.itemsDeleted.push(componentName);
          } catch (error) {
            return responseBody.errors.push({
              name: componentName,
              error: handleEsError({ error, response }),
            });
          }
        })
      );

      return response.ok({ body: responseBody });
    }
  );
};
