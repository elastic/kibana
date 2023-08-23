/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LinkCategoryType, SecurityPageName } from '@kbn/security-solution-navigation';
import { SERVER_APP_ID } from '@kbn/security-solution-plugin/common';
import type { LinkItem } from '@kbn/security-solution-plugin/public';
import { ExternalPageName, SecurityPagePath } from '../constants';
import type { ProjectLinkCategory, ProjectNavigationLink } from '../types';
import {
  IconGraphLazy,
  IconLoggingLazy,
  IconIndexManagementLazy,
  IconSecurityShieldLazy,
  IconMapServicesLazy,
  IconProductFeaturesAlertingLazy,
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

export const projectSettingsNavCategories: ProjectLinkCategory[] = [
  {
    type: LinkCategoryType.separator,
    linkIds: [
      ExternalPageName.cloudUsersAndRoles,
      ExternalPageName.cloudBilling,
      ExternalPageName.integrationsSecurity,
      SecurityPageName.entityAnalyticsManagement,
    ],
  },
  {
    type: LinkCategoryType.accordion,
    label: i18n.MANAGEMENT_CATEGORY_TITLE,
    categories: [
      {
        label: i18n.DATA_CATEGORY_TITLE,
        iconType: IconIndexManagementLazy,
        linkIds: [
          ExternalPageName.managementIndexManagement,
          ExternalPageName.managementTransforms,
          ExternalPageName.managementIngestPipelines,
          ExternalPageName.managementDataViews,
          ExternalPageName.managementJobsListLink,
          ExternalPageName.managementPipelines,
        ],
      },
      {
        label: i18n.ALERTS_INSIGHTS_CATEGORY_TITLE,
        iconType: IconProductFeaturesAlertingLazy,
        linkIds: [
          ExternalPageName.managementCases,
          ExternalPageName.managementTriggersActionsConnectors,
          ExternalPageName.managementMaintenanceWindows,
        ],
      },
      {
        label: i18n.CONTENT_CATEGORY_TITLE,
        iconType: IconSecurityShieldLazy,
        linkIds: [
          ExternalPageName.managementObjects,
          ExternalPageName.managementFiles,
          ExternalPageName.managementReporting,
          ExternalPageName.managementTags,
        ],
      },
      {
        label: i18n.OTHER_CATEGORY_TITLE,
        iconType: IconMapServicesLazy,
        linkIds: [ExternalPageName.managementApiKeys, ExternalPageName.managementSettings],
      },
    ],
  },
];

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
  {
    id: ExternalPageName.managementIndexManagement,
    title: i18n.MANAGEMENT_INDEX_MANAGEMENT_TITLE,
  },
  {
    id: ExternalPageName.managementTransforms,
    title: i18n.MANAGEMENT_TRANSFORMS_TITLE,
  },
  {
    id: ExternalPageName.managementMaintenanceWindows,
    title: i18n.MANAGEMENT_MAINTENANCE_WINDOWS_TITLE,
  },
  {
    id: ExternalPageName.managementIngestPipelines,
    title: i18n.MANAGEMENT_INGEST_PIPELINES_TITLE,
  },
  {
    id: ExternalPageName.managementDataViews,
    title: i18n.MANAGEMENT_DATA_VIEWS_TITLE,
  },
  {
    id: ExternalPageName.managementJobsListLink,
    title: i18n.MANAGEMENT_ML_TITLE,
  },
  {
    id: ExternalPageName.managementPipelines,
    title: i18n.MANAGEMENT_LOGSTASH_PIPELINES_TITLE,
  },
  {
    id: ExternalPageName.managementCases,
    title: i18n.MANAGEMENT_CASES_TITLE,
  },
  {
    id: ExternalPageName.managementTriggersActionsConnectors,
    title: i18n.MANAGEMENT_CONNECTORS_TITLE,
  },
  {
    id: ExternalPageName.managementReporting,
    title: i18n.MANAGEMENT_REPORTING_TITLE,
  },
  {
    id: ExternalPageName.managementObjects,
    title: i18n.MANAGEMENT_SAVED_OBJECTS_TITLE,
  },
  {
    id: ExternalPageName.managementApiKeys,
    title: i18n.MANAGEMENT_API_KEYS_TITLE,
  },
  {
    id: ExternalPageName.managementTags,
    title: i18n.MANAGEMENT_TAGS_TITLE,
  },
  {
    id: ExternalPageName.managementFiles,
    title: i18n.MANAGEMENT_FILES_TITLE,
  },
  {
    id: ExternalPageName.managementSettings,
    title: i18n.MANAGEMENT_SETTINGS_TITLE,
  },
];
