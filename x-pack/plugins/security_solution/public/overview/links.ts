/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DETECTION_RESPONSE_PATH,
  LANDING_PATH,
  OVERVIEW_PATH,
  SecurityPageName,
  SERVER_APP_ID,
} from '../../common/constants';
import { DETECTION_RESPONSE, GETTING_STARTED, OVERVIEW } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import overviewPageImg from '../common/images/overview_page.png';
import detectionResponsePageImg from '../common/images/detection_response_page.png';

export const overviewLinks: LinkItem = {
  id: SecurityPageName.overview,
  title: OVERVIEW,
  landingImage: overviewPageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.overviewDescription', {
    defaultMessage:
      'Summary of your security environment activity, including alerts, events, recent items, and a news feed!',
  }),
  path: OVERVIEW_PATH,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.overview', {
      defaultMessage: 'Overview',
    }),
  ],
};

export const gettingStartedLinks: LinkItem = {
  id: SecurityPageName.landing,
  title: GETTING_STARTED,
  path: LANDING_PATH,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.getStarted', {
      defaultMessage: 'Getting started',
    }),
  ],
  skipUrlState: true,
  hideTimeline: true,
};

export const detectionResponseLinks: LinkItem = {
  id: SecurityPageName.detectionAndResponse,
  title: DETECTION_RESPONSE,
  landingImage: detectionResponsePageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.detectionAndResponseDescription', {
    defaultMessage:
      'Information about your Alerts and Cases within the Security Solution, including Hosts and Users with Alerts.',
  }),
  path: DETECTION_RESPONSE_PATH,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.detectionAndResponse', {
      defaultMessage: 'Detection & Response',
    }),
  ],
};
