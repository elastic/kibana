/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { ALERTS_PATH, SecurityPageName } from '../../common/constants';
import { ALERTS } from '../app/translations';
import { LinkItem, FEATURE } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.alerts,
  title: ALERTS,
  path: ALERTS_PATH,
  features: [FEATURE.general],
  globalNavEnabled: true,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.alerts', {
      defaultMessage: 'Alerts',
    }),
  ],
  globalSearchEnabled: true,
  globalNavOrder: 9001,
};
