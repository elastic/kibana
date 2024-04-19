/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { AI_INSIGHTS } from '../app/translations';
import { SecurityPageName, SERVER_APP_ID, AI_INSIGHTS_PATH } from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  capabilities: [`${SERVER_APP_ID}.show`],
  experimentalKey: 'assistantAlertsInsights',
  globalNavPosition: 4,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.aiInsights', {
      defaultMessage: 'AI Insights',
    }),
  ],
  id: SecurityPageName.aiInsights,
  path: AI_INSIGHTS_PATH,
  title: AI_INSIGHTS,
};
