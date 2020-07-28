/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { componentTemplateSchema } from './schema_validation';

const paramsSchema = schema.object({
  name: schema.string(),
});

export const registerUpdateRoute = ({
  router,
  license,
  lib: { isEsError },
}: RouteDependencies): void => {
  router.put(
    {
      path: addBasePath('/component_templates/{name}'),
      validate: {
        body: componentTemplateSchema,
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const { name } = req.params;
      const { template, version, _meta } = req.body;

      try {
        // Verify component exists; ES will throw 404 if not
        await callAsCurrentUser('dataManagement.getComponentTemplate', { name });

        const response = await callAsCurrentUser('dataManagement.saveComponentTemplate', {
          name,
          body: {
            template,
            version,
            _meta,
          },
        });

        return res.ok({ body: response });
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
};
