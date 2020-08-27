/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ENTERPRISE_SEARCH_PLUGIN = {
  ID: 'enterpriseSearch',
  NAME: i18n.translate('xpack.enterpriseSearch.productName', {
    defaultMessage: 'Enterprise Search',
  }),
  URL: '/app/enterprise_search',
};

export const APP_SEARCH_PLUGIN = {
  ID: 'appSearch',
  NAME: i18n.translate('xpack.enterpriseSearch.appSearch.productName', {
    defaultMessage: 'App Search',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.appSearch.productDescription', {
    defaultMessage:
      'Leverage dashboards, analytics, and APIs for advanced application search made simple.',
  }),
  URL: '/app/enterprise_search/app_search',
};

export const WORKPLACE_SEARCH_PLUGIN = {
  ID: 'workplaceSearch',
  NAME: i18n.translate('xpack.enterpriseSearch.workplaceSearch.productName', {
    defaultMessage: 'Workplace Search',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.workplaceSearch.productDescription', {
    defaultMessage:
      'Search all documents, files, and sources available across your virtual workplace.',
  }),
  URL: '/app/enterprise_search/workplace_search',
};

export const JSON_HEADER = { 'Content-Type': 'application/json' }; // This needs specific casing or Chrome throws a 415 error

export const ENGINES_PAGE_SIZE = 10;
