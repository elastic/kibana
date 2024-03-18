/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { ExternalPageName } from './constants';
import type { GetCloudUrl, ProjectPageName } from './types';
import { SECURITY_PROJECT_TYPE } from '../../../common';

export const getNavLinkIdFromProjectPageName = (projectNavLinkId: ProjectPageName): string => {
  const cleanId = projectNavLinkId.replace(/\/(.*)$/, ''); // remove any trailing path
  const fullId = cleanId.includes(':') ? cleanId : `${APP_UI_ID}:${cleanId}`; // add the Security appId if not defined
  return fullId.replace(/:$/, ''); // clean trailing separator to app root links to contain the appId alone
};

export const getProjectPageNameFromNavLinkId = (navLinkId: string): ProjectPageName => {
  const cleanId = navLinkId.includes(':') ? navLinkId : `${navLinkId}:`; // add trailing separator to app root links that contain the appId alone
  const fullId = cleanId.replace(`${APP_UI_ID}:`, ''); // remove Security appId if present
  return fullId as ProjectPageName;
};

export const isCloudLink = (linkId: string): boolean => linkId.startsWith('cloud:');
export const getCloudLinkKey = (linkId: string): string => linkId.replace('cloud:', '');

export const getCloudUrl: GetCloudUrl = (cloudUrlKey, cloud) => {
  switch (cloudUrlKey) {
    case 'billing':
      return cloud.billingUrl;
    case 'deployment':
      return cloud.deploymentUrl;
    case 'organization':
      return cloud.organizationUrl;
    case 'performance':
      return cloud.performanceUrl;
    case 'profile':
      return cloud.profileUrl;
    case 'usersAndRoles':
      return cloud.usersAndRolesUrl;
    case 'projects':
      return cloud.projectsUrl;
    default:
      return undefined;
  }
};

export const getProjectDetails = (cloud: CloudStart) => cloud.serverless;
export const getProjectFeaturesUrl = (cloud: CloudStart): string | undefined => {
  const projectsBaseUrl = getCloudUrl('projects', cloud);
  const projectId = getProjectDetails(cloud)?.projectId;
  if (!projectsBaseUrl || !projectId) {
    return undefined;
  }
  return `${projectsBaseUrl}/${SECURITY_PROJECT_TYPE}/${projectId}?open=securityProjectFeatures`;
};

/**
 * Defines the navigation items that should be in the footer of the side navigation.
 * @todo Make it a new property in the `NavigationLink` type `position?: 'top' | 'bottom' (default: 'top')`
 */
export const isBottomNavItemId = (id: string) =>
  id === SecurityPageName.landing ||
  id === ExternalPageName.devTools ||
  id === ExternalPageName.management ||
  id === ExternalPageName.integrationsSecurity ||
  id === ExternalPageName.cloudUsersAndRoles ||
  id === ExternalPageName.cloudBilling;
