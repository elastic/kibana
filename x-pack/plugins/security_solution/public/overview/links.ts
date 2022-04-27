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
} from '../../common/constants';
import { DETECTION_RESPONSE, GETTING_STARTED, OVERVIEW } from '../app/translations';
import { FEATURE, LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.overview,
  label: OVERVIEW,
  url: OVERVIEW_PATH,
  globalNavEnabled: true,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.overview', {
      defaultMessage: 'Overview',
    }),
  ],
  globalNavOrder: 9000,
};

export const landingLinks: LinkItem = {
  id: SecurityPageName.landing,
  label: GETTING_STARTED,
  url: LANDING_PATH,
  globalNavEnabled: false,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.getStarted', {
      defaultMessage: 'Getting started',
    }),
  ],
};

export const detectionResponseLinks: LinkItem = {
  id: SecurityPageName.detectionAndResponse,
  label: DETECTION_RESPONSE,
  url: DETECTION_RESPONSE_PATH,
  globalNavEnabled: false,
  experimentalKey: 'detectionResponseEnabled',
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.detectionAndResponse', {
      defaultMessage: 'Detection & Response',
    }),
  ],
};
