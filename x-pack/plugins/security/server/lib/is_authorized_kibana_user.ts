/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthorizationService } from './authorization/service';
import { RESERVED_PRIVILEGES_APPLICATION_WILDCARD } from '../../common/constants';
import { serializePrivileges } from './authorization/privileges_serializer';
import { PrivilegeSerializer } from './authorization';

export const isAuthorizedKibanaUser = async (
  authorizationService: AuthorizationService,
  request: Legacy.Request,
  userRoles: string[] = []
) => {
  const hasCredentials = request.auth && request.auth.credentials;
  const useRbac = authorizationService.mode.useRbacForRequest(request);

  if (!hasCredentials || !useRbac) {
    return true;
  }

  if (userRoles.includes('superuser')) {
    return true;
  }

  const { application, privileges } = authorizationService;

  const serializedPrivileges = serializePrivileges(application, privileges.get());

  // Reserved privileges on their own do not grant access to kibana; rather, they augment existing kibana access.
  // Therefore, a user is said to be an authorized Kibana user iff they have at least one known privilege that isn't reserved.
  const knownUnreservedPrivileges = Object.keys(serializedPrivileges[application]).filter(
    knownPriv => !PrivilegeSerializer.isSerializedReservedPrivilege(knownPriv)
  );

  const userPrivileges = await authorizationService.getPrivilegesWithRequest(request);

  return userPrivileges.some(
    privilege =>
      privilege.application !== RESERVED_PRIVILEGES_APPLICATION_WILDCARD &&
      privilege.privileges.some(priv => knownUnreservedPrivileges.includes(priv))
  );
};
