/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppDefinition,
  CardNavExtensionDefinition,
} from '@kbn/management-cards-navigation/src/types';
import { getNavigationPropsFromId, SecurityPageName } from '@kbn/security-solution-navigation';
import type { Services } from '../common/services';
import { ExternalPageName } from './links/constants';
import type { ProjectPageName } from './links/types';

const SecurityManagementCards = new Map<ProjectPageName, AppDefinition['category']>([
  [ExternalPageName.visualize, 'content'],
  [ExternalPageName.maps, 'content'],
  [SecurityPageName.entityAnalyticsManagement, 'alerts'],
]);

export const enableManagementCardsLanding = (services: Services) => {
  const { management, application } = services;

  services.getProjectNavLinks$().subscribe((projectNavLinks) => {
    const cardNavDefinitions = projectNavLinks.reduce<Record<string, CardNavExtensionDefinition>>(
      (acc, projectNavLink) => {
        if (SecurityManagementCards.has(projectNavLink.id)) {
          const { appId, deepLinkId, path } = getNavigationPropsFromId(projectNavLink.id);

          acc[projectNavLink.id] = {
            category: SecurityManagementCards.get(projectNavLink.id) ?? 'other',
            title: projectNavLink.title,
            description: projectNavLink.description ?? '',
            icon: projectNavLink.landingIcon ?? '',
            href: application.getUrlForApp(appId, { deepLinkId, path }),
            skipValidation: true,
          };
        }
        return acc;
      },
      {}
    );

    management.setupCardsNavigation({
      enabled: true,
      extendCardNavDefinitions: services.serverless.getNavigationCards(
        services.security.authz.isRoleManagementEnabled(),
        cardNavDefinitions
      ),
    });
  });
};
