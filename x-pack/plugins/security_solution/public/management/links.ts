/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  BLOCKLIST_PATH,
  ENDPOINTS_PATH,
  EVENT_FILTERS_PATH,
  HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_PATH,
  POLICIES_PATH,
  SecurityPageName,
  TRUSTED_APPS_PATH,
} from '../../common/constants';
import {
  BLOCKLIST,
  ENDPOINTS,
  EVENT_FILTERS,
  HOST_ISOLATION_EXCEPTIONS,
  MANAGE,
  POLICIES,
  TRUSTED_APPLICATIONS,
} from '../app/translations';
import { FEATURE, LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.administration,
  title: MANAGE,
  path: MANAGEMENT_PATH,
  globalNavEnabled: false,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.manage', {
      defaultMessage: 'Manage',
    }),
  ],
  links: [
    {
      id: SecurityPageName.endpoints,
      globalNavEnabled: true,
      title: ENDPOINTS,
      globalNavOrder: 9006,
      path: ENDPOINTS_PATH,
    },
    {
      id: SecurityPageName.policies,
      title: POLICIES,
      path: POLICIES_PATH,
      experimentalKey: 'policyListEnabled',
    },
    {
      id: SecurityPageName.trustedApps,
      title: TRUSTED_APPLICATIONS,
      path: TRUSTED_APPS_PATH,
    },
    {
      id: SecurityPageName.eventFilters,
      title: EVENT_FILTERS,
      path: EVENT_FILTERS_PATH,
    },
    {
      id: SecurityPageName.hostIsolationExceptions,
      title: HOST_ISOLATION_EXCEPTIONS,
      path: HOST_ISOLATION_EXCEPTIONS_PATH,
    },
    {
      id: SecurityPageName.blocklist,
      title: BLOCKLIST,
      path: BLOCKLIST_PATH,
    },
  ],
};
