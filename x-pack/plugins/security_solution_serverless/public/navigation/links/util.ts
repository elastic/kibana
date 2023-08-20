/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID } from '@kbn/security-solution-plugin/common';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ProjectPageName } from './types';

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
export const getCloudUrl = (cloudUrlKey: string, cloud: CloudStart): string | undefined => {
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
    default:
      return undefined;
  }
};
