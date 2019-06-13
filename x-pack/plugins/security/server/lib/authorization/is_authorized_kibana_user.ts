/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthorizationService } from './service';
import { KibanaApplication } from './types';

export const isAuthorizedKibanaUser = async (
  authorizationService: AuthorizationService,
  request: Legacy.Request,
  userRoles: string[] = []
) => {
  // While `request.auth.credentials` is the cononical way to check for credentials on Hapi requests,
  // it is _not_ populated on the `/api/security/v1/authenticate` route, where the user's session is first established.
  // `request.headers.authorization` is present both on the authentiate route, and on subsequent requests by the nature of our authentication provider.
  const hasCredentials = request.headers.authorization;
  const useRbac = authorizationService.mode.useRbacForRequest(request);

  if (!hasCredentials || !useRbac) {
    return true;
  }

  if (userRoles.includes('superuser')) {
    return true;
  }

  const userPrivileges = await authorizationService.getPrivilegesWithRequest(request);
  if (!userPrivileges.success) {
    // TODO: what to do?
    return true;
  }

  const userKibanaPrivileges = userPrivileges.value as KibanaApplication[];

  return userKibanaPrivileges.some(privilege => {
    const hasBasePrivileges = privilege.base.length > 0;
    const hasFeaturePrivileges = Object.values(privilege.feature).some(
      featurePrivileges => featurePrivileges.length > 0
    );
    return hasBasePrivileges || hasFeaturePrivileges;
  });
};
