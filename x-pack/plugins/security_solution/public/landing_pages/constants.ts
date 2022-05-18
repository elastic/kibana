/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../app/types';

export interface LandingNavGroup {
  label: string;
  itemIds: SecurityPageName[];
}

export const MANAGE_NAVIGATION_CATEGORIES: LandingNavGroup[] = [
  {
    label: i18n.translate('xpack.securitySolution.landing.siemTitle', {
      defaultMessage: 'SIEM',
    }),
    itemIds: [SecurityPageName.rules, SecurityPageName.exceptions],
  },
  {
    label: i18n.translate('xpack.securitySolution.landing.endpointsTitle', {
      defaultMessage: 'ENDPOINTS',
    }),
    itemIds: [
      SecurityPageName.endpoints,
      SecurityPageName.policies,
      SecurityPageName.trustedApps,
      SecurityPageName.eventFilters,
      SecurityPageName.blocklist,
      SecurityPageName.hostIsolationExceptions,
    ],
  },
];
