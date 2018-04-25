/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { checkUserPermission } from './check_user_permission';

export function checkSavedObjectPermissions() {
  return (request) => ({
    method: 'all',
    intercept: async (client, method, type) => {
      const action = `kibana:/savedobject/${method}/${type}`;

      const { credentials } = request.auth;

      // TODO(larry): dashboard_mode_auth_scope.js uses request's SOC before the user is attached to the request. Chicken and egg...
      if (!credentials) {
        console.warn(
          `!!!!DANGER!!!! No credentials on request (${request.path})! Unable to authorize Saved Object Client request. See trace below:`
        );
        console.trace();
        return;
      }

      const { roles } = request.auth.credentials;

      const fakeAccessCheck = roles.indexOf('kibana_ols_user') >= 0;

      const hasPermission = await checkUserPermission(action, fakeAccessCheck || true);
      console.log('hasPermission returned', hasPermission);

      if (!hasPermission) {
        const errorMessage = `Unauthorized: User must have "kibana:all" permission to perform this action.`;
        throw client.errors.decorateForbiddenError(new Error(), errorMessage);
      }
    }
  });
}
