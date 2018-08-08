/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CONFIG_DASHBOARD_ONLY_MODE_ROLES,
  AUTH_SCOPE_DASHBORD_ONLY_MODE,
} from '../common';

const superuserRole = 'superuser';

/**
 *  Registered with the security plugin to extend the auth scopes to
 *  include "xpack:dashboardMode" when the request should be in
 *  dashboard only mode.
 *
 *  @type {XpackSecurity.ScopeExtender}
 *  @param {Hapi.Request} request
 *  @param {Object} user user object from the security api
 *  @return {Promise<Array<string>|void>}
 */
export async function getDashboardModeAuthScope(request, user) {
  const uiSettings = request.getUiSettingsService();
  const dashboardOnlyModeRoles = await uiSettings.get(CONFIG_DASHBOARD_ONLY_MODE_ROLES);
  if (!dashboardOnlyModeRoles || user.roles.length === 0) {
    return;
  }

  const isDashboardOnlyModeRole = role => dashboardOnlyModeRoles.includes(role);
  const isSuperUserRole = role => role === superuserRole;

  const isDashboardOnlyModeUser = user.roles.find(isDashboardOnlyModeRole);
  const isSuperUser = user.roles.find(isSuperUserRole);
  if (isDashboardOnlyModeUser && !isSuperUser) {
    return [AUTH_SCOPE_DASHBORD_ONLY_MODE];
  }
}
