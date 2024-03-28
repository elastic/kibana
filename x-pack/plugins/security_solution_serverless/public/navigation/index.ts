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
import { initSideNavigation } from './side_navigation';
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
  const { serverless } = services;
  serverless.setProjectHome(APP_PATH);
  initSideNavigation(services);

  enableManagementCardsLanding(services);

  subscribeBreadcrumbs(services);
};
