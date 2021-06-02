/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({}, { unknowns: 'allow' });

export function registerSimulateRoute({ router, lib }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/index_templates/simulate'),
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const template = request.body as TypeOf<typeof bodySchema>;

      try {
        const { body: templatePreview } = await client.asCurrentUser.indices.simulateIndexTemplate({
          body: template,
        });

        return response.ok({ body: templatePreview });
      } catch (e) {
        if (lib.isEsError(e)) {
          const error = lib.parseEsError(e.response);
          return response.customError({
            statusCode: e.statusCode,
            body: {
              message: error.message,
              attributes: error,
            },
          });
        }
        // Case: default
        throw e;
      }
    }
  );
}
