/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { DASHBOARDS_PATH, SecurityPageName, SERVER_APP_ID } from '../../common/constants';
import { DASHBOARDS } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import { links as kubernetesLinks } from '../kubernetes/links';
import {
  dashboardLinks as cloudSecurityPostureLinks,
  vulnerabilityDashboardLink,
} from '../cloud_security_posture/links';
import {
  ecsDataQualityDashboardLinks,
  detectionResponseLinks,
  entityAnalyticsLinks,
  overviewLinks,
} from '../overview/links';

export const dashboardsLandingLinks: LinkItem = {
  id: SecurityPageName.dashboards,
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
    vulnerabilityDashboardLink,
    entityAnalyticsLinks,
    ecsDataQualityDashboardLinks,
  ],
  skipUrlState: false,
};
