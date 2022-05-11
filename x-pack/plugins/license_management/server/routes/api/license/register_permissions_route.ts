/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPermissions } from '../../../lib/permissions';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../helpers';

export function registerPermissionsRoute({
  router,
  lib: { handleEsError },
  config: { isSecurityEnabled },
}: RouteDependencies) {
  router.post({ path: addBasePath('/permissions'), validate: false }, async (ctx, req, res) => {
    const { client } = (await ctx.core).elasticsearch;

    try {
      return res.ok({
        body: await getPermissions({ client, isSecurityEnabled }),
      });
    } catch (error) {
      return handleEsError({ error, response: res });
    }
  });
}
