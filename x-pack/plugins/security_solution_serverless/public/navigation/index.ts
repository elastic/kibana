/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH, MANAGE_PATH } from '@kbn/security-solution-plugin/common';
import type { Services } from '../common/services';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { subscribeNavigationTree } from './navigation_tree';
import { getSecuritySideNavComponent } from './side_navigation';

const SECURITY_MANAGE_PATH = `${APP_PATH}${MANAGE_PATH}`;

export const configureNavigation = (services: Services) => {
  const { serverless, securitySolution, management } = services;
  securitySolution.setIsSidebarEnabled(false);
  management.setLandingPageRedirect(SECURITY_MANAGE_PATH);

  serverless.setProjectHome(APP_PATH);
  serverless.setSideNavComponent(getSecuritySideNavComponent(services));

  subscribeNavigationTree(services);
  subscribeBreadcrumbs(services);
};
