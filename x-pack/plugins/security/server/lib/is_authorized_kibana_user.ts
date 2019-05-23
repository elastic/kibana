/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import _ from 'lodash';
import { AuthorizationService } from './authorization/service';

export const isAuthorizedKibanaUser = async (
  authorizationService: AuthorizationService,
  request: Legacy.Request
) => {
  const { auth } = request;
  if (auth && auth.credentials) {
    const { roles = [] } = auth.credentials as Record<string, any>;
    if (roles.includes('superuser')) {
      return true;
    }
  }

  const userPrivileges = await authorizationService.getPrivilegesWithRequest(request);

  return userPrivileges.length > 0;
};
