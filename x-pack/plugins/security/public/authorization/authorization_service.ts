/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-public';

import type { ConfigType } from '../config';
import { PrivilegesAPIClient, RolesAPIClient } from '../management';

interface SetupParams {
  config: ConfigType;
  http: HttpStart;
}

export class AuthorizationService {
  public setup({ config, http }: SetupParams): AuthorizationServiceSetup {
    const isRoleManagementEnabled = () => config.roleManagementEnabled;
    const rolesAPIClient = new RolesAPIClient(http);
    const privilegesAPIClient = new PrivilegesAPIClient(http);

    return {
      isRoleManagementEnabled,
      roles: {
        getRoles: rolesAPIClient.getRoles,
        getRole: rolesAPIClient.getRole,
        deleteRole: rolesAPIClient.deleteRole,
        saveRole: rolesAPIClient.saveRole,
      },
      privileges: {
        getAll: privilegesAPIClient.getAll.bind(privilegesAPIClient),
      },
    };
  }
}
