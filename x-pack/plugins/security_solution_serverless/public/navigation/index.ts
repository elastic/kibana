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
import { subscribeBreadcrumbs } from './breadcrumbs';
import { getSecuritySideNavComponent } from './side_navigation';
import { initProjectNavigation } from './project_navigation';
import { projectAppLinksSwitcher } from './links/app_links';
import { formatProjectDeepLinks } from './links/deep_links';
import { enableManagementCardsLanding } from './management_cards';

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

  enableManagementCardsLanding(services);

  if (services.experimentalFeatures.platformNavEnabled) {
    initProjectNavigation(services);
  } else {
    // TODO: Remove this else block as platform is enabled by default
    // Issue: https://github.com/elastic/kibana/issues/174944

    // const projectNavigationTree = new ProjectNavigationTree(services);
    // projectNavigationTree.getChromeNavigationTree$().subscribe((chromeNavigationTree) => {
    //   serverless.setNavigation({ navigationTree: chromeNavigationTree });
    // });
    serverless.setSideNavComponentDeprecated(getSecuritySideNavComponent(services));
  }
  management.setIsSidebarEnabled(false);

  subscribeBreadcrumbs(services);
};
