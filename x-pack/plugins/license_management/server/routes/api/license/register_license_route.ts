/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { putLicense } from '../../../lib/license';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../helpers';

export function registerLicenseRoute({ router, plugins: { licensing } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath(''),
      validate: {
        query: schema.object({ acknowledge: schema.string() }),
        body: schema.object({
          license: schema.object({}, { unknowns: 'allow' }),
        }),
      },
    },
    async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
      try {
        return res.ok({
          body: await putLicense({
            acknowledge: Boolean(req.query.acknowledge),
            callAsCurrentUser,
            licensing,
            license: req.body,
          }),
        });
      } catch (e) {
        return res.internalError({ body: e });
      }
    }
  );
}
