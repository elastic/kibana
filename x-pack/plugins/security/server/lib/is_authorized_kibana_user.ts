/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthorizationService } from './authorization/service';
import { AuthenticatedUser } from '../../common/model';

export const isAuthorizedKibanaUser = async (
  authorizationService: AuthorizationService,
  request: Legacy.Request,
  user?: AuthenticatedUser
) => {
  const roles = getUserRoles(request, user);
  if (roles.includes('superuser')) {
    return true;
  }

  const userPrivileges = await authorizationService.getPrivilegesWithRequest(request);

  // Reserved privileges on their own do not grant access to kibana.; rather, they augment existing kibana access.
  // Therefore, a user is said to be an authorized Kibana user iff they have at least one privilege that isn't reserved.
  return userPrivileges.some(privilege => !privilege._reserved);
};

function getUserRoles(request: Legacy.Request, user?: AuthenticatedUser) {
  if (user) {
    return user.roles;
  }
  if (request.auth && request.auth.credentials) {
    return (request.auth.credentials as AuthenticatedUser).roles;
  }
  return [];
}
