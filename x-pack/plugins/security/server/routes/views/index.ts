/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineAccessAgreementRoutes } from './access_agreement';
import { defineAccountManagementRoutes } from './account_management';
import { defineLoggedOutRoutes } from './logged_out';
import { defineLoginRoutes } from './login';
import { defineLogoutRoutes } from './logout';
import { defineOverwrittenSessionRoutes } from './overwritten_session';
import { defineCaptureURLRoutes } from './capture_url';
import { RouteDefinitionParams } from '..';

export function defineViewRoutes(params: RouteDefinitionParams) {
  if (
    params.config.authc.selector.enabled ||
    params.authc.isProviderTypeEnabled('basic') ||
    params.authc.isProviderTypeEnabled('token')
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
