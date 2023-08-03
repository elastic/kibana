/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SERVER_APP_ID } from '@kbn/security-solution-plugin/common';
import type { LinkItem } from '@kbn/security-solution-plugin/public';
import { ExternalPageName, SecurityPagePath } from '../constants';
import type { ProjectNavigationLink } from '../types';
import {
  IconGraphLazy,
  IconLoggingLazy,
  IconIndexManagementLazy,
} from '../../../common/lazy_icons';
import * as i18n from './project_settings_translations';

// appLinks configures the Security Solution pages links
const projectSettingsAppLink: LinkItem = {
  id: SecurityPageName.projectSettings,
  title: i18n.PROJECT_SETTINGS_TITLE,
  path: SecurityPagePath[SecurityPageName.projectSettings],
  capabilities: [`${SERVER_APP_ID}.show`],
  hideTimeline: true,
  skipUrlState: true,
  links: [], // endpoints and cloudDefend links are added in createAssetsLinkFromManage
};

export const createProjectSettingsLinkFromManage = (manageLink: LinkItem): LinkItem => {
  const projectSettingsSubLinks = [];

  const entityAnalyticsLink = manageLink.links?.find(
    ({ id }) => id === SecurityPageName.entityAnalyticsManagement
  );
  if (entityAnalyticsLink) {
    projectSettingsSubLinks.push(entityAnalyticsLink);
  }

  return {
    ...projectSettingsAppLink,
    links: projectSettingsSubLinks, // cloudDefend and endpoints links are added in the projectAppLinksSwitcher on runtime
  };
};

// navLinks define the navigation links for the Security Solution pages and External pages as well
export const projectSettingsNavLinks: ProjectNavigationLink[] = [
  {
    id: ExternalPageName.cloudUsersAndRoles,
    title: i18n.CLOUD_USERS_ROLES_TITLE,
    description: i18n.CLOUD_USERS_ROLES_DESCRIPTION,
    landingIcon: IconGraphLazy,
  },
  {
    id: ExternalPageName.cloudBilling,
    title: i18n.CLOUD_BILLING_TITLE,
    description: i18n.CLOUD_BILLING_DESCRIPTION,
    landingIcon: IconLoggingLazy,
  },
  {
    id: ExternalPageName.integrationsSecurity,
    title: i18n.INTEGRATIONS_TITLE,
    description: i18n.INTEGRATIONS_DESCRIPTION,
    landingIcon: IconIndexManagementLazy,
  },
];
