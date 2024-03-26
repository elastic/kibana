/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-public';

import type { ConfigType } from '../config';

interface SetupParams {
  config: ConfigType;
}

export class AuthorizationService {
  public setup({ config }: SetupParams): AuthorizationServiceSetup {
    const isRoleManagementEnabled = () => config.roleManagementEnabled;

    return { isRoleManagementEnabled };
  }
}
