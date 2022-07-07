/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName, SERVER_APP_ID, THREAT_INTELLIGENCE_PATH } from '../../common/constants';
import { THREAT_INTELLIGENCE } from '../app/translations';
import { LinkItem } from '../common/links';
import threatIntelligencePageImg from '../common/images/threat_intelligence.png';

export const links: LinkItem = {
  id: SecurityPageName.threatIntelligence,
  title: THREAT_INTELLIGENCE,
  path: THREAT_INTELLIGENCE_PATH,
  landingImage: threatIntelligencePageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.threatIntelligence.description', {
    defaultMessage:
      'Elastic threat intelligence helps you see if you are open to or have been subject to current or historical known threats.',
  }),
  capabilities: [`${SERVER_APP_ID}.show`],
  globalNavEnabled: false,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.threatIntelligence', {
      defaultMessage: 'Threat Intelligence',
    }),
  ],
  globalNavOrder: 9005,
};
