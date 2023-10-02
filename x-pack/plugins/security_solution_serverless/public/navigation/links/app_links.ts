/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppLinksSwitcher,
  LinkItem,
} from '@kbn/security-solution-plugin/public/common/links/types';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { cloneDeep, remove } from 'lodash';
import { createInvestigationsLinkFromTimeline } from './sections/investigations_links';
import { mlAppLink } from './sections/ml_links';
import { createAssetsLinkFromManage } from './sections/assets_links';
import { createProjectSettingsLinkFromManage } from './sections/project_settings_links';

// This function is called by the security_solution plugin to alter the app links
// that will be registered to the Security Solution application on Serverless projects.
// The capabilities filtering is done after this function is called by the security_solution plugin.
export const projectAppLinksSwitcher: AppLinksSwitcher = (appLinks) => {
  const projectAppLinks = cloneDeep(appLinks) as LinkItem[];

  // Remove timeline link
  const [timelineLinkItem] = remove(projectAppLinks, { id: SecurityPageName.timelines });
  if (timelineLinkItem) {
    // Add investigations link
    projectAppLinks.push(createInvestigationsLinkFromTimeline(timelineLinkItem));
  }

  // Remove manage link
  const [manageLinkItem] = remove(projectAppLinks, { id: SecurityPageName.administration });

  if (manageLinkItem) {
    // Add assets link
    projectAppLinks.push(createAssetsLinkFromManage(manageLinkItem));
  }

  // Add ML link
  projectAppLinks.push(mlAppLink);

  if (manageLinkItem) {
    // Add project settings link
    projectAppLinks.push(createProjectSettingsLinkFromManage(manageLinkItem));
  }

  return projectAppLinks;
};
