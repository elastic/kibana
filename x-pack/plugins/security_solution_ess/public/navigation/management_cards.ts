/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CardNavExtensionDefinition } from '@kbn/management-cards-navigation';
import {
  getNavigationPropsFromId,
  SecurityPageName,
  ExternalPageName,
} from '@kbn/security-solution-navigation';
import { combineLatestWith } from 'rxjs';
import type { Services } from '../common/services';

const SecurityManagementCards = new Map<string, CardNavExtensionDefinition['category']>([
  [ExternalPageName.visualize, 'content'],
  [ExternalPageName.maps, 'content'],
  [SecurityPageName.entityAnalyticsManagement, 'alerts'],
]);
export const enableManagementCardsLanding = (services: Services) => {
  const { securitySolution, management, application, navigation } = services;

  securitySolution
    .getNavLinks$()
    .pipe(combineLatestWith(navigation.isSolutionNavEnabled$))
    .subscribe(([navLinks, isSolutionNavEnabled]) => {
      const cardNavDefinitions = navLinks.reduce<Record<string, CardNavExtensionDefinition>>(
        (acc, navLink) => {
          if (SecurityManagementCards.has(navLink.id)) {
            const { appId, deepLinkId, path } = getNavigationPropsFromId(navLink.id);
            acc[navLink.id] = {
              category: SecurityManagementCards.get(navLink.id) ?? 'other',
              title: navLink.title,
              description: navLink.description ?? '',
              icon: navLink.landingIcon ?? '',
              href: application.getUrlForApp(appId, { deepLinkId, path }),
              skipValidation: true,
            };
          }
          return acc;
        },
        {}
      );

      management.setupCardsNavigation({
        enabled: isSolutionNavEnabled,
        extendCardNavDefinitions: cardNavDefinitions,
      });
    });
};
