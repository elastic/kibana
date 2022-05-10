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
  EXCEPTIONS_PATH,
  HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_PATH,
  POLICIES_PATH,
  RULES_PATH,
  SecurityPageName,
  TRUSTED_APPS_PATH,
} from '../../common/constants';
import {
  BLOCKLIST,
  ENDPOINTS,
  EVENT_FILTERS,
  EXCEPTIONS,
  HOST_ISOLATION_EXCEPTIONS,
  MANAGE,
  POLICIES,
  RULES,
  TRUSTED_APPLICATIONS,
} from '../app/translations';
import { FEATURE, LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.administration,
  title: MANAGE,
  path: MANAGEMENT_PATH,
  skipUrlState: true,
  globalNavEnabled: false,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.manage', {
      defaultMessage: 'Manage',
    }),
  ],
  links: [
    {
      id: SecurityPageName.rules,
      title: RULES,
      path: RULES_PATH,
      globalNavEnabled: false,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.rules', {
          defaultMessage: 'Rules',
        }),
      ],
      globalSearchEnabled: true,
    },
    {
      id: SecurityPageName.exceptions,
      title: EXCEPTIONS,
      path: EXCEPTIONS_PATH,
      globalNavEnabled: false,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.exceptions', {
          defaultMessage: 'Exception lists',
        }),
      ],
      globalSearchEnabled: true,
    },
    {
      id: SecurityPageName.endpoints,
      globalNavEnabled: true,
      title: ENDPOINTS,
      globalNavOrder: 9006,
      path: ENDPOINTS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.policies,
      title: POLICIES,
      path: POLICIES_PATH,
      skipUrlState: true,
      experimentalKey: 'policyListEnabled',
    },
    {
      id: SecurityPageName.trustedApps,
      title: TRUSTED_APPLICATIONS,
      path: TRUSTED_APPS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.eventFilters,
      title: EVENT_FILTERS,
      path: EVENT_FILTERS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.hostIsolationExceptions,
      title: HOST_ISOLATION_EXCEPTIONS,
      path: HOST_ISOLATION_EXCEPTIONS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.blocklist,
      title: BLOCKLIST,
      path: BLOCKLIST_PATH,
      skipUrlState: true,
    },
  ],
};
