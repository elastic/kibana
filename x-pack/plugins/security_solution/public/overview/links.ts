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
import { LinkItem } from '../common/links/types';

export const overviewLinks: LinkItem = {
  id: SecurityPageName.overview,
  title: OVERVIEW,
  path: OVERVIEW_PATH,
  globalNavEnabled: true,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.overview', {
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
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.getStarted', {
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
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.detectionAndResponse', {
      defaultMessage: 'Detection & Response',
    }),
  ],
};
