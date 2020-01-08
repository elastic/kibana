/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BuiltinESPrivileges } from '../../../../common/model';
import { RouteDefinitionParams } from '../..';

export function defineGetBuiltinPrivilegesRoutes({ router, clusterClient }: RouteDefinitionParams) {
  router.get(
    { path: '/internal/security/esPrivileges/builtin', validate: false },
    async (context, request, response) => {
      const privileges: BuiltinESPrivileges = await clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.getBuiltinPrivileges');

      // Exclude the `none` privilege, as it doesn't make sense as an option within the Kibana UI
      privileges.cluster = privileges.cluster.filter(privilege => privilege !== 'none');
      privileges.index = privileges.index.filter(privilege => privilege !== 'none');

      return response.ok({ body: privileges });
    }
  );
}
