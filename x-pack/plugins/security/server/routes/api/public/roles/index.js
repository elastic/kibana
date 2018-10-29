/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildPrivilegeMap } from '../../../../lib/authorization';
import { getClient } from '../../../../../../../server/lib/get_client_shield';
import { routePreCheckLicense } from '../../../../lib/route_pre_check_license';
import { initGetRolesApi } from './get';
import { initDeleteRolesApi } from './delete';
import { initPutRolesApi } from './put';

export function initPublicRolesApi(server) {
  const callWithRequest = getClient(server).callWithRequest;
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  const { application, actions } = server.plugins.security.authorization;
  const savedObjectTypes = server.savedObjects.types;
  const privilegeMap = buildPrivilegeMap(savedObjectTypes, actions);

  initGetRolesApi(server, callWithRequest, routePreCheckLicenseFn, application);
  initPutRolesApi(server, callWithRequest, routePreCheckLicenseFn, privilegeMap, application);
  initDeleteRolesApi(server, callWithRequest, routePreCheckLicenseFn);
}
