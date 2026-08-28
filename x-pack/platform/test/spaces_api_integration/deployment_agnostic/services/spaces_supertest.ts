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

/**
 * `timeouts.request` is off by default, so opt this suite family in explicitly. These are the
 * suites where an unbounded wait has actually bitten (elastic/kibana#287381): a stalled request
 * burned 120s in a `before each` hook and 360s in a test body, and each time the FTR aborted the
 * whole config, reporting one stalled request as six failed tests.
 *
 * Every request these suites make is a small spaces API call - the slowest hook does three
 * saved-object imports plus six share operations in ~11s total - so 30s is a wide margin over
 * normal and well under any mocha budget here. An FTR config may still override it via
 * `timeouts.request`, and an individual caller via `RequestHeadersOptions.requestTimeout`.
 */
const SPACES_REQUEST_TIMEOUT_MS = 30_000;

export function SpacesSupertestProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const config = getService('config');
  const license = config.get('esTestCluster.license');
  const isServerless = config.get('serverless');
  const defaultRequestTimeout = config.get('timeouts.request') || SPACES_REQUEST_TIMEOUT_MS;

  return {
    async getSupertestWithRoleScope(
      user: User,
      options: RequestHeadersOptions = {
        useCookieHeader: true,
        withCommonHeaders: false,
        withInternalHeaders: true,
      }
    ) {
      const withTimeout: RequestHeadersOptions = {
        requestTimeout: defaultRequestTimeout,
        ...options,
      };

      if (!user || (license === 'basic' && !isServerless)) {
        return new SupertestWithBasicAuth(supertestWithoutAuth, user, withTimeout.requestTimeout);
      }

      const isBuiltIn = isBuiltInRole(user.role);

      if (!isBuiltIn) {
        await samlAuth.setCustomRole(getRoleDefinitionForUser(user));
      }

      if (withTimeout.useCookieHeader) {
        const cookieHeader = await samlAuth.getM2MApiCookieCredentialsWithRoleScope(
          isBuiltIn ? user.role : samlAuth.CUSTOM_ROLE
        );
        return new SupertestWithRoleScope(
          cookieHeader,
          supertestWithoutAuth,
          samlAuth,
          withTimeout
        );
      }

      // HTTP requests will be called with API key in header by default
      const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope(
        isBuiltIn ? user.role : samlAuth.CUSTOM_ROLE
      );
      return new SupertestWithRoleScope(roleAuthc, supertestWithoutAuth, samlAuth, withTimeout);
    },
  };
}
