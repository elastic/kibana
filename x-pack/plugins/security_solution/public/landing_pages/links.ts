/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DASHBOARDS_PATH,
  SecurityPageName,
  SERVER_APP_ID,
  THREAT_HUNTING_PATH,
} from '../../common/constants';
import { DASHBOARDS, THREAT_HUNTING } from '../app/translations';
import { LinkItem } from '../common/links/types';
import { overviewLinks, detectionResponseLinks } from '../overview/links';
import { links as hostsLinks } from '../hosts/links';
import { links as networkLinks } from '../network/links';
import { links as usersLinks } from '../users/links';

export const dashboardsLandingLinks: LinkItem = {
  id: SecurityPageName.dashboardsLanding,
  title: DASHBOARDS,
  path: DASHBOARDS_PATH,
  globalNavEnabled: false,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.dashboards', {
      defaultMessage: 'Dashboards',
    }),
  ],
  links: [overviewLinks, detectionResponseLinks],
  skipUrlState: true,
  hideTimeline: true,
};

export const threatHuntingLandingLinks: LinkItem = {
  id: SecurityPageName.threatHuntingLanding,
  title: THREAT_HUNTING,
  path: THREAT_HUNTING_PATH,
  globalNavEnabled: false,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.threatHunting', {
      defaultMessage: 'Threat hunting',
    }),
  ],
  links: [hostsLinks, networkLinks, usersLinks],
  skipUrlState: true,
  hideTimeline: true,
};
