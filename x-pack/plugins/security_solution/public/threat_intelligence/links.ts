/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { INDICATORS_PATH, SecurityPageName, SERVER_APP_ID } from '../../common/constants';
import { THREAT_INTELLIGENCE } from '../app/translations';
import type { LinkItem } from '../common/links';

export const links: LinkItem = {
  id: SecurityPageName.indicators,
  title: THREAT_INTELLIGENCE,
  path: INDICATORS_PATH,
  experimentalKey: 'threatIntelligenceEnabled',
  landingImage: threatIntelligencePageImg,
  globalNavPosition: 7,
  description: i18n.translate('xpack.securitySolution.appLinks.threatIntelligence.description', {
    defaultMessage:
      'Elastic threat intelligence helps you see if you are open to or have been subject to current or historical known threats.',
  }),
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.threatIntelligence.indicators', {
      defaultMessage: 'Indicators',
    }),
  ],
};
