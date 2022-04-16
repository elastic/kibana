/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { defineAccessAgreementRoutes } from './access_agreement';
import { defineAccountManagementRoutes } from './account_management';
import { defineCaptureURLRoutes } from './capture_url';
import { defineLoggedOutRoutes } from './logged_out';
import { defineLoginRoutes } from './login';
import { defineLogoutRoutes } from './logout';
import { defineOverwrittenSessionRoutes } from './overwritten_session';

export function defineViewRoutes(params: RouteDefinitionParams) {
  if (
    params.config.authc.selector.enabled ||
    params.config.authc.sortedProviders.some(({ type }) => type === 'basic' || type === 'token')
  ) {
    defineLoginRoutes(params);
  }

  defineAccessAgreementRoutes(params);
  defineAccountManagementRoutes(params);
  defineLoggedOutRoutes(params);
  defineLogoutRoutes(params);
  defineOverwrittenSessionRoutes(params);
  defineCaptureURLRoutes(params);
}
