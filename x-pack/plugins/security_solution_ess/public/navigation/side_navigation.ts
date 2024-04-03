/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { type Services } from '../common/services';

export const initSideNavigation = (services: Services) => {
  const { securitySolution, navigation } = services;

  navigation.isSolutionNavEnabled$.subscribe((isSolutionNavigationEnabled) => {
    securitySolution.setIsSolutionNavigationEnabled(isSolutionNavigationEnabled);
  });

  const { navigationTree$, panelContentProvider } = securitySolution.getSolutionNavigation();
  navigation.addSolutionNavigation({
    id: 'security',
    homePage: `securitySolutionUI:${SecurityPageName.landing}`,
    title: 'Security',
    icon: 'logoSecurity',
    navigationTree$,
    panelContentProvider,
    dataTestSubj: 'securitySolutionSideNav',
  });
};
