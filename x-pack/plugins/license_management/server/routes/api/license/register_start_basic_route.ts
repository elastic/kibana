/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { startBasic } from '../../../lib/start_basic';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../helpers';

export function registerStartBasicRoute({ router, plugins: { licensing } }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/start_basic'),
      validate: { query: schema.object({ acknowledge: schema.string() }) },
    },
    async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
      try {
        return res.ok({
          body: await startBasic({
            acknowledge: Boolean(req.query.acknowledge),
            callAsCurrentUser,
            licensing,
          }),
        });
      } catch (e) {
        return res.internalError({ body: e });
      }
    }
  );
}
