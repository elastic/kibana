/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LinkItem } from '@kbn/security-solution-plugin/public';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { ExternalPageName } from '../constants';
import type { ProjectNavigationLink } from '../types';
import * as i18n from './project_settings_translations';

export const createProjectSettingsLinksFromManage = (manageLink: LinkItem): LinkItem[] => {
  const entityAnalyticsLink = manageLink.links?.find(
    ({ id }) => id === SecurityPageName.entityAnalyticsManagement
  );
  return entityAnalyticsLink
    ? [
        {
          ...entityAnalyticsLink,
          sideNavDisabled: true, // Link disabled from the side nav but configured in the navigationTree (breadcrumbs). It is displayed in the management cards landing.
        },
      ]
    : [];
};

export const projectSettingsNavLinks: ProjectNavigationLink[] = [
  {
    id: ExternalPageName.management,
    title: i18n.MANAGEMENT_TITLE,
  },
  {
    id: ExternalPageName.integrationsSecurity,
    title: i18n.INTEGRATIONS_TITLE,
  },
  {
    id: ExternalPageName.cloudUsersAndRoles,
    title: i18n.CLOUD_USERS_ROLES_TITLE,
  },
  {
    id: ExternalPageName.cloudBilling,
    title: i18n.CLOUD_BILLING_TITLE,
  },
  {
    id: ExternalPageName.maps,
    title: i18n.MAPS_TITLE,
    description: i18n.MAPS_DESCRIPTION,
    landingIcon: 'graphApp',
    disabled: true, // Link disabled from the side nav but configured in the navigationTree (breadcrumbs). It is displayed in the management cards landing.
  },
  {
    id: ExternalPageName.visualize,
    title: i18n.VISUALIZE_TITLE,
    description: i18n.VISUALIZE_DESCRIPTION,
    landingIcon: 'visualizeApp',
    disabled: true, // Link disabled from the side nav but configured in the navigationTree (breadcrumbs). It is displayed in the management cards landing.
  },
];
