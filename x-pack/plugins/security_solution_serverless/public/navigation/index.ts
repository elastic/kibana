/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH, SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { ServerlessSecurityPublicConfig } from '../types';
import type { Services } from '../common/services';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { SecurityPagePath } from './links/constants';
import { subscribeNavigationTree } from './navigation_tree';
import { getSecuritySideNavComponent } from './side_navigation';

const SECURITY_PROJECT_SETTINGS_PATH = `${APP_PATH}${
  SecurityPagePath[SecurityPageName.projectSettings]
}`;

export const configureNavigation = (
  services: Services,
  serverConfig: ServerlessSecurityPublicConfig
) => {
  const { serverless, securitySolution, management } = services;
  securitySolution.setIsSidebarEnabled(false);

  if (!serverConfig.developer.disableManagementUrlRedirect) {
    management.setLandingPageRedirect(SECURITY_PROJECT_SETTINGS_PATH);
  }

  serverless.setProjectHome(APP_PATH);
  serverless.setSideNavComponent(getSecuritySideNavComponent(services));

  subscribeNavigationTree(services);
  subscribeBreadcrumbs(services);
};
