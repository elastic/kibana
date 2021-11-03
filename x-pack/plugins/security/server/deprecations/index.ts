/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getPrivilegeDeprecationsService } from './privilege_deprecations';
export {
  registerKibanaDashboardOnlyRoleDeprecation,
  KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME,
} from './kibana_dashboard_only_role';
export {
  registerKibanaUserRoleDeprecation,
  KIBANA_ADMIN_ROLE_NAME,
  KIBANA_USER_ROLE_NAME,
} from './kibana_user_role';
export { registerMLPrivilegesDeprecation } from './ml_privileges';
