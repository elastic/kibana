/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-public';
import type { AuthorizationCurrentUserApiKeyPrivilegesResponse } from '@kbn/security-plugin-types-public/src/authorization/authorization_service';

import type { ConfigType } from '../config';

interface SetupParams {
  config: ConfigType;
  http: HttpSetup;
}

export class AuthorizationService {
  public setup({ config, http }: SetupParams): AuthorizationServiceSetup {
    const isRoleManagementEnabled = () => config.roleManagementEnabled;

    const getCurrentUserApiKeyPrivileges = async () => {
      const { canManageApiKeys, canManageCrossClusterApiKeys, canManageOwnApiKeys } =
        (await http.get(
          '/internal/security/api_key'
        )) as AuthorizationCurrentUserApiKeyPrivilegesResponse;

      return { canManageApiKeys, canManageCrossClusterApiKeys, canManageOwnApiKeys };
    };

    return { isRoleManagementEnabled, getCurrentUserApiKeyPrivileges };
  }
}
