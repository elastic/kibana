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
  IconMapServicesLazy,
  IconIndexManagementLazy,
  IconUsersRolesLazy,
  IconReportingLazy,
  IconVisualizationLazy,
} from '../../../common/lazy_icons';
import * as i18n from './project_settings_translations';

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
];
