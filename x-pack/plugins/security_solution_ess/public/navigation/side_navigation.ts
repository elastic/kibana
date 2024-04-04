/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName, SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { type Services } from '../common/services';

export const SOLUTION_NAME = i18n.translate('xpack.securitySolutionEss.nav.solutionName', {
  defaultMessage: 'Security',
});

export const initSideNavigation = (services: Services) => {
  const { securitySolution, navigation } = services;

  navigation.isSolutionNavEnabled$.subscribe((isSolutionNavigationEnabled) => {
    securitySolution.setIsSolutionNavigationEnabled(isSolutionNavigationEnabled);
  });

  const { navigationTree$, panelContentProvider } = securitySolution.getSolutionNavigation();
  navigation.addSolutionNavigation({
    id: 'security',
    homePage: `${SECURITY_UI_APP_ID}:${SecurityPageName.landing}`,
    title: SOLUTION_NAME,
    icon: 'logoSecurity',
    navigationTree$,
    panelContentProvider,
    dataTestSubj: 'securitySolutionSideNav',
  });
};
