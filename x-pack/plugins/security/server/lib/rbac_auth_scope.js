/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RBAC_AUTH_SCOPE } from '../../common/constants';

export function initRbacAuthScope(server, authorization) {
  server.plugins.security.registerAuthScopeGetter(async (request) => {

    // if they don't have security, we can't use RBAC
    if (!authorization.isRbacEnabled()) {
      return [];
    }

    const checkPrivilegesAtAllResources = authorization.checkPrivilegesAtAllResourcesWithRequest(request);
    const { result } = await checkPrivilegesAtAllResources([authorization.actions.login]);

    // if they're legacy, we won't use RBAC
    if (result === authorization.CHECK_PRIVILEGES_RESULT.LEGACY) {
      return [];
    }

    // otherwise, we're gonna use RBAC
    return [RBAC_AUTH_SCOPE];
  });
}

