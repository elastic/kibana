/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';
import { SupertestWithRoleScope } from './role_scoped_supertest';

export interface RequestHeadersOptions {
  useCookieHeader?: boolean;
  withInternalHeaders?: boolean;
  withCommonHeaders?: boolean;
  withCustomHeaders?: Record<string, string>;
}

/**
 * Provides a customized 'supertest' instance that is authenticated using the custom role-based API key
 * and enriched with the appropriate request headers. This service allows you to perform
 * HTTP requests with specific authentication and header configurations, ensuring that
 * the requests are scoped to the provided role and environment.
 *
 * Use this service to easily test API endpoints with role-specific authorization and
 * custom headers, both in serverless and stateful environments.
 *
 * Pass '{ useCookieHeader: true }' to use Cookie header for authentication instead of API key.
 * It is the correct way to perform HTTP requests for internal end-points.
 */
export function CustomRoleScopedSupertestProvider({
  getService,
}: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  return {
    async getSupertestWithCustomRoleScope(
      options: RequestHeadersOptions = {
        useCookieHeader: false,
        withCommonHeaders: false,
        withInternalHeaders: false,
      }
    ) {
      // if 'useCookieHeader' set to 'true', HTTP requests will be called with cookie Header (like in browser)
      if (options.useCookieHeader) {
        const cookieHeader = await samlAuth.getM2MApiCookieCredentialsWithCustomRoleScope();
        return new SupertestWithRoleScope(cookieHeader, supertestWithoutAuth, samlAuth, options);
      }

      // HTTP requests will be called with API key in header by default
      const roleAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();
      return new SupertestWithRoleScope(roleAuthc, supertestWithoutAuth, samlAuth, options);
    },
  };
}
