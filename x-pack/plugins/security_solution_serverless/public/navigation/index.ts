/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH } from '@kbn/security-solution-plugin/common';
import type { CoreSetup } from '@kbn/core/public';
import type { SecuritySolutionServerlessPluginSetupDeps } from '../types';
import type { Services } from '../common/services';
import { withServicesProvider } from '../common/services';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { ProjectNavigationTree } from './navigation_tree';
import { getSecuritySideNavComponent } from './side_navigation';
import { SecuritySideNavComponent } from './default_navigation'; // TODO: lazy load
import { projectAppLinksSwitcher } from './links/app_links';
import { formatProjectDeepLinks } from './links/deep_links';

export const setupNavigation = (
  _core: CoreSetup,
  { securitySolution }: SecuritySolutionServerlessPluginSetupDeps
) => {
  securitySolution.setAppLinksSwitcher(projectAppLinksSwitcher);
  securitySolution.setDeepLinksFormatter(formatProjectDeepLinks);
};

export const startNavigation = (services: Services) => {
  const { serverless, management } = services;
  serverless.setProjectHome(APP_PATH);

  management.setupCardsNavigation({ enabled: true });

  const projectNavigationTree = new ProjectNavigationTree(services);

  if (services.experimentalFeatures.platformNavEnabled) {
    const SideNavComponentWithServices = withServicesProvider(SecuritySideNavComponent, services);
    serverless.setSideNavComponent(SideNavComponentWithServices);
  } else {
    projectNavigationTree.getChromeNavigationTree$().subscribe((chromeNavigationTree) => {
      serverless.setNavigation({ navigationTree: chromeNavigationTree });
    });
    serverless.setSideNavComponent(getSecuritySideNavComponent(services));
  }
  management.setIsSidebarEnabled(false);

  subscribeBreadcrumbs(services);
};
