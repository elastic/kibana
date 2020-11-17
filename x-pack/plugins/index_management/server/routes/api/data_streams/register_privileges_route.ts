/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

interface PrivilegesFromEs {
  username: string;
  has_all_requested: boolean;
  cluster: Record<string, boolean>;
  index: Record<string, Record<string, boolean>>;
  application: Record<string, boolean>;
}

const bodySchema = schema.object({
  names: schema.arrayOf(schema.string(), { defaultValue: [] }),
  privileges: schema.arrayOf(schema.string(), { defaultValue: [] }),
});

export function registerPrivilegesRoute({
  router,
  license,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/data_streams_privileges'), validate: { body: bodySchema } },
    license.guardApiRoute(async (ctx, req, response) => {
      const { asCurrentUser } = ctx.core.elasticsearch.client;
      const { names, privileges } = req.body as TypeOf<typeof bodySchema>;

      // Skip the privileges check if security is not enabled or empty arrays are passed
      if (!config.isSecurityEnabled() || names.length === 0 || privileges.length === 0) {
        return response.ok();
      }
      try {
        const privilegesResponse = await asCurrentUser.security.hasPrivileges<PrivilegesFromEs>({
          body: { index: [{ names, privileges }] },
        });
        return response.ok({ body: privilegesResponse.body.index });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
