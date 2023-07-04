/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH } from '@kbn/security-solution-plugin/common';
import type { Services } from '../common/services';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { subscribeNavigationTree } from './navigation_tree';
import { getSecuritySideNavComponent } from './side_navigation';

/**
 * Configures the serverless project navigation
 * and disables the regular Security Solution sideNav
 */
export const setServerlessNavigation = (services: Services) => {
  services.securitySolution.setIsSidebarEnabled(false);
  services.serverless.setProjectHome(APP_PATH);
  services.serverless.setSideNavComponent(getSecuritySideNavComponent(services));

  subscribeNavigationTree(services);
  subscribeBreadcrumbs(services);
};
