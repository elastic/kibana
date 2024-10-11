/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { cloneDeep, remove, find } from 'lodash';
import type { AppLinkItems, LinkItem } from '../../../common/links/types';
import {
  createInvestigationsLinkFromNotes,
  createInvestigationsLinkFromTimeline,
  updateInvestigationsLinkFromNotes,
} from './sections/investigations_links';
import { mlAppLink } from './sections/ml_links';
import { createAssetsLinkFromManage } from './sections/assets_links';
import { createSettingsLinksFromManage } from './sections/settings_links';

// This function is called by the security_solution plugin to alter the app links
// that will be registered to the Security Solution application using the new "solution-centric" IA.
// The capabilities filtering is done after this function is called by the security_solution plugin.
// TODO: remove after rollout https://github.com/elastic/kibana/issues/179572
export const solutionAppLinksSwitcher = (appLinks: AppLinkItems): AppLinkItems => {
  const solutionAppLinks = cloneDeep(appLinks) as LinkItem[];

  // Remove timeline link
  const [timelineLinkItem] = remove(solutionAppLinks, { id: SecurityPageName.timelines });
  if (timelineLinkItem) {
    solutionAppLinks.push(createInvestigationsLinkFromTimeline(timelineLinkItem));
  }

  // Remove note link
  const investigationsLinkItem = find(solutionAppLinks, { id: SecurityPageName.investigations });
  const [noteLinkItem] = remove(solutionAppLinks, { id: SecurityPageName.notes });
  if (noteLinkItem) {
    if (!investigationsLinkItem) {
      solutionAppLinks.push(createInvestigationsLinkFromNotes(noteLinkItem));
    } else {
      solutionAppLinks.push(
        updateInvestigationsLinkFromNotes(investigationsLinkItem, noteLinkItem)
      );
    }
  }

  // Remove manage link
  const [manageLinkItem] = remove(solutionAppLinks, { id: SecurityPageName.administration });

  if (manageLinkItem) {
    solutionAppLinks.push(createAssetsLinkFromManage(manageLinkItem));
    solutionAppLinks.push(...createSettingsLinksFromManage(manageLinkItem));
  }

  // Add ML link
  solutionAppLinks.push(mlAppLink);

  return Object.freeze(solutionAppLinks);
};
