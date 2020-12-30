/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const NAV = {
  OVERVIEW: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.overview', {
    defaultMessage: 'Overview',
  }),
  SOURCES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.sources', {
    defaultMessage: 'Sources',
  }),
  GROUPS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.groups', {
    defaultMessage: 'Groups',
  }),
  GROUP_OVERVIEW: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.groups.groupOverview',
    {
      defaultMessage: 'Overview',
    }
  ),
  SOURCE_PRIORITIZATION: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.groups.sourcePrioritization',
    { defaultMessage: 'Source Prioritization' }
  ),
  ROLE_MAPPINGS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.roleMappings', {
    defaultMessage: 'Role Mappings',
  }),
  SECURITY: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.security', {
    defaultMessage: 'Security',
  }),
  SETTINGS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.settings', {
    defaultMessage: 'Settings',
  }),
  PERSONAL_DASHBOARD: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.personalDashboard',
    {
      defaultMessage: 'View my personal dashboard',
    }
  ),
};

export const MAX_TABLE_ROW_ICONS = 3;

export const SOURCE_STATUSES = {
  INDEXING: 'indexing',
  SYNCED: 'synced',
  SYNCING: 'syncing',
  AWAITING_USER_ACTION: 'awaiting_user_action',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
  ALWAYS_SYNCED: 'always_synced',
};

export const CUSTOM_SERVICE_TYPE = 'custom';
