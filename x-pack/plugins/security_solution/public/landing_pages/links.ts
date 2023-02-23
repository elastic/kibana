/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DASHBOARDS_PATH,
  EXPLORE_PATH,
  SecurityPageName,
  SERVER_APP_ID,
} from '../../common/constants';
import { DASHBOARDS, EXPLORE } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import {
  ecsDataQualityDashboardLinks,
  detectionResponseLinks,
  entityAnalyticsLinks,
  overviewLinks,
} from '../overview/links';
import { exploreLinks } from '../explore/links';
import { links as kubernetesLinks } from '../kubernetes/links';
import { dashboardLinks as cloudSecurityPostureLinks } from '../cloud_security_posture/links';

export const dashboardsLandingLinks: LinkItem = {
  id: SecurityPageName.dashboardsLanding,
  title: DASHBOARDS,
  path: DASHBOARDS_PATH,
  globalNavPosition: 1,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.dashboards', {
      defaultMessage: 'Dashboards',
    }),
  ],
  links: [
    overviewLinks,
    detectionResponseLinks,
    kubernetesLinks,
    cloudSecurityPostureLinks,
    entityAnalyticsLinks,
    ecsDataQualityDashboardLinks,
  ],
  skipUrlState: true,
};

export const threatHuntingLandingLinks: LinkItem = {
  id: SecurityPageName.exploreLanding,
  title: EXPLORE,
  path: EXPLORE_PATH,
  globalNavPosition: 6,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.explore', {
      defaultMessage: 'Explore',
    }),
  ],
  links: exploreLinks,
  skipUrlState: true,
};
