/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  names: schema.string(),
});

export const registerDeleteRoute = ({ router, license }: RouteDependencies): void => {
  router.delete(
    {
      path: addBasePath('/component_templates/{names}'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const { names } = req.params;
      const componentNames = names.split(',');

      const response: { itemsDeleted: string[]; errors: any[] } = {
        itemsDeleted: [],
        errors: [],
      };

      await Promise.all(
        componentNames.map((componentName) => {
          return callAsCurrentUser('dataManagement.deleteComponentTemplate', {
            name: componentName,
          })
            .then(() => response.itemsDeleted.push(componentName))
            .catch((e) =>
              response.errors.push({
                name: componentName,
                error: e,
              })
            );
        })
      );

      return res.ok({ body: response });
    })
  );
};
