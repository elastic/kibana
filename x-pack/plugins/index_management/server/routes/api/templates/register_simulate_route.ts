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

export function registerSimulateRoute({ router, license, lib }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/index_templates/simulate'),
      validate: { body: bodySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const template = req.body as TypeOf<typeof bodySchema>;

      try {
        const templatePreview = await callAsCurrentUser('dataManagement.simulateTemplate', {
          body: template,
        });

        return res.ok({ body: templatePreview });
      } catch (e) {
        if (lib.isEsError(e)) {
          const error = lib.parseEsError(e.response);
          return res.customError({
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
    })
  );
}
