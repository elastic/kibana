/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '../..';

export function defineGetBuiltinPrivilegesRoutes({ router }: RouteDefinitionParams) {
  router.get(
    { path: '/internal/security/esPrivileges/builtin', validate: false },
    async (context, request, response) => {
      const esClient = (await context.core).elasticsearch.client;
      const privileges = await esClient.asCurrentUser.security.getBuiltinPrivileges();

      // Exclude the `none` privilege, as it doesn't make sense as an option within the Kibana UI
      privileges.cluster = privileges.cluster.filter((privilege) => privilege !== 'none');
      const indexPriviledges = Array.isArray(privileges.index)
        ? privileges.index
        : [privileges.index];
      privileges.index = indexPriviledges.filter((privilege) => privilege !== 'none');

      return response.ok({ body: privileges });
    }
  );
}
