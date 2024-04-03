/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { cloneDeep, find, remove } from 'lodash';
import type { AppLinksSwitcher, LinkItem } from '../../../common/links/types';
import { createInvestigationsLinkFromTimeline } from './sections/investigations_links';
import { mlAppLink } from './sections/ml_links';
import { createAssetsLinkFromManage } from './sections/assets_links';
import { createSettingsLinksFromManage } from './sections/settings_links';

// This function is called by the security_solution plugin to alter the app links
// that will be registered to the Security Solution application on Serverless projects.
// The capabilities filtering is done after this function is called by the security_solution plugin.
export const solutionAppLinksSwitcher: AppLinksSwitcher = (appLinks) => {
  const projectAppLinks = cloneDeep(appLinks) as LinkItem[];

  // Remove timeline link
  const [timelineLinkItem] = remove(projectAppLinks, { id: SecurityPageName.timelines });
  if (timelineLinkItem) {
    projectAppLinks.push(createInvestigationsLinkFromTimeline(timelineLinkItem));
  }

  // Remove data quality dashboard link
  const dashboardLinkItem = find(projectAppLinks, { id: SecurityPageName.dashboards });
  if (dashboardLinkItem && dashboardLinkItem.links) {
    remove(dashboardLinkItem.links, { id: SecurityPageName.dataQuality });
  }

  // Remove manage link
  const [manageLinkItem] = remove(projectAppLinks, { id: SecurityPageName.administration });

  if (manageLinkItem) {
    projectAppLinks.push(createAssetsLinkFromManage(manageLinkItem));
    projectAppLinks.push(...createSettingsLinksFromManage(manageLinkItem));
  }

  // Add ML link
  projectAppLinks.push(mlAppLink);

  return projectAppLinks;
};
