/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPermissions } from '../../../lib/permissions';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../helpers';

export function registerPermissionsRoute({
  router,
  config: { isSecurityEnabled },
}: RouteDependencies) {
  router.post({ path: addBasePath('/permissions'), validate: false }, async (ctx, req, res) => {
    const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;

    try {
      return res.ok({
        body: await getPermissions({ callAsCurrentUser, isSecurityEnabled }),
      });
    } catch (e) {
      return res.internalError({ body: e });
    }
  });
}
