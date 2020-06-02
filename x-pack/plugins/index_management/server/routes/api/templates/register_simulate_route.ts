/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({}, { unknowns: 'allow' });

export function registerSimulateRoute({ router, license, lib }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/simulate-template'),
      validate: { body: bodySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;
      const template = req.body as TypeOf<typeof bodySchema>;

      try {
        const templatePreview = await callAsCurrentUser('transport.request', {
          path: '_index_template/_simulate',
          method: 'POST',
          body: template,
        });

        return res.ok({ body: templatePreview });
      } catch (e) {
        if (lib.isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );
}
