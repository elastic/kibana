/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeMap } from 'x-pack/plugins/security/common/model/kibana_privilege';

export function initGetPrivilegesApi(
  server: Record<string, any>,
  routePreCheckLicenseFn: () => void
) {
  server.route({
    method: 'GET',
    path: '/api/security/privileges',
    handler() {
      const { authorization } = server.plugins.security;
      const privileges: PrivilegeMap = authorization.privileges.get();

      return privileges;
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
