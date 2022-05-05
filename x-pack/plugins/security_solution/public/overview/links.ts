/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DASHBOARDS_PATH,
  DETECTION_RESPONSE_PATH,
  LANDING_PATH,
  OVERVIEW_PATH,
  SecurityPageName,
} from '../../common/constants';
import { DASHBOARDS, DETECTION_RESPONSE, GETTING_STARTED, OVERVIEW } from '../app/translations';
import { FEATURE, LinkItem } from '../common/links/types';

export const overviewLinks: LinkItem = {
  id: SecurityPageName.overview,
  title: OVERVIEW,
  path: OVERVIEW_PATH,
  globalNavEnabled: true,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.overview', {
      defaultMessage: 'Overview',
    }),
  ],
  globalNavOrder: 9000,
};

export const gettingStartedLinks: LinkItem = {
  id: SecurityPageName.landing,
  title: GETTING_STARTED,
  path: LANDING_PATH,
  globalNavEnabled: false,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.getStarted', {
      defaultMessage: 'Getting started',
    }),
  ],
  skipUrlState: true,
};

export const detectionResponseLinks: LinkItem = {
  id: SecurityPageName.detectionAndResponse,
  title: DETECTION_RESPONSE,
  path: DETECTION_RESPONSE_PATH,
  globalNavEnabled: false,
  experimentalKey: 'detectionResponseEnabled',
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.detectionAndResponse', {
      defaultMessage: 'Detection & Response',
    }),
  ],
};

export const dashboardsLandingLinks: LinkItem = {
  id: SecurityPageName.dashboardsLanding,
  title: DASHBOARDS,
  path: DASHBOARDS_PATH,
  globalNavEnabled: false,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.dashboards', {
      defaultMessage: 'Dashboards',
    }),
  ],
  links: [overviewLinks, detectionResponseLinks],
};
