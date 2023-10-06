/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH, SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { CoreSetup } from '@kbn/core/public';
import type {
  SecuritySolutionServerlessPluginSetupDeps,
  ServerlessSecurityPublicConfig,
} from '../types';
import type { Services } from '../common/services';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { SecurityPagePath } from './links/constants';
import { ProjectNavigationTree } from './navigation_tree';
import { getSecuritySideNavComponent } from './side_navigation';
import { getDefaultNavigationComponent } from './default_navigation';
import { getProjectAppLinksSwitcher } from './links/app_links';
import { formatProjectDeepLinks } from './links/deep_links';
import type { ExperimentalFeatures } from '../../common/experimental_features';

const SECURITY_PROJECT_SETTINGS_PATH = `${APP_PATH}${
  SecurityPagePath[SecurityPageName.projectSettings]
}`;

export const setupNavigation = (
  _core: CoreSetup,
  { securitySolution }: SecuritySolutionServerlessPluginSetupDeps,
  experimentalFeatures: ExperimentalFeatures
) => {
  securitySolution.setAppLinksSwitcher(getProjectAppLinksSwitcher(experimentalFeatures));
  securitySolution.setDeepLinksFormatter(formatProjectDeepLinks);
};

export const startNavigation = (services: Services, config: ServerlessSecurityPublicConfig) => {
  const { serverless, securitySolution, management } = services;
  securitySolution.setIsSidebarEnabled(false);
  serverless.setProjectHome(APP_PATH);

  const projectNavigationTree = new ProjectNavigationTree(services);

  if (services.experimentalFeatures.platformNavEnabled) {
    projectNavigationTree.getNavigationTree$().subscribe((navigationTree) => {
      serverless.setSideNavComponent(getDefaultNavigationComponent(navigationTree, services));
    });
  } else {
    if (!config.developer.disableManagementUrlRedirect) {
      management.setLandingPageRedirect(SECURITY_PROJECT_SETTINGS_PATH);
    }
    projectNavigationTree.getChromeNavigationTree$().subscribe((chromeNavigationTree) => {
      serverless.setNavigation({ navigationTree: chromeNavigationTree });
    });
    serverless.setSideNavComponent(getSecuritySideNavComponent(services));
  }
  management.setIsSidebarEnabled(false);

  subscribeBreadcrumbs(services);
};
