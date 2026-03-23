/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHeadersOptions } from '../../../api_integration_deployment_agnostic/services/role_scoped_supertest';
import { SupertestWithRoleScope } from '../../../api_integration_deployment_agnostic/services/role_scoped_supertest';
import { getRoleDefinitionForUser, isBuiltInRole } from '../../common/lib/authentication';
import type { TestDefinitionAuthentication as User } from '../../common/lib/types';
import { SupertestWithBasicAuth } from '../../common/services/basic_auth_supertest';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export type SupertestWithRoleScopeType = SupertestWithBasicAuth | SupertestWithRoleScope;

export function SpacesSupertestProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const config = getService('config');
  const license = config.get('esTestCluster.license');
  const isServerless = config.get('serverless');

  return {
    async getSupertestWithRoleScope(
      user: User,
      options: RequestHeadersOptions = {
        useCookieHeader: true,
        withCommonHeaders: false,
        withInternalHeaders: true,
      }
    ) {
      if (!user || (license === 'basic' && !isServerless)) {
        return new SupertestWithBasicAuth(supertestWithoutAuth, user);
      }

      const isBuiltIn = isBuiltInRole(user.role);

      if (!isBuiltIn) {
        await samlAuth.setCustomRole(getRoleDefinitionForUser(user));
      }

      if (options.useCookieHeader) {
        const cookieHeader = await samlAuth.getM2MApiCookieCredentialsWithRoleScope(
          isBuiltIn ? user.role : samlAuth.CUSTOM_ROLE
        );
        return new SupertestWithRoleScope(cookieHeader, supertestWithoutAuth, samlAuth, options);
      }

      // HTTP requests will be called with API key in header by default
      const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope(
        isBuiltIn ? user.role : samlAuth.CUSTOM_ROLE
      );
      return new SupertestWithRoleScope(roleAuthc, supertestWithoutAuth, samlAuth, options);
    },
  };
}
