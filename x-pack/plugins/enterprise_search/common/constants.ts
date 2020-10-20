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
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.navTitle', {
    defaultMessage: 'Overview',
  }),
  SUBTITLE: i18n.translate('xpack.enterpriseSearch.featureCatalogue.subtitle', {
    defaultMessage: 'Search everything',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.FeatureCatalogue.description', {
    defaultMessage: 'Create search experiences with a refined set of APIs and tools.',
  }),
  APP_DESCRIPTIONS: [
    i18n.translate('xpack.enterpriseSearch.featureCatalogueDescription1', {
      defaultMessage: 'Build a powerful search experience.',
    }),
    i18n.translate('xpack.enterpriseSearch.featureCatalogueDescription2', {
      defaultMessage: 'Connect your users to relevant data.',
    }),
    i18n.translate('xpack.enterpriseSearch.featureCatalogueDescription3', {
      defaultMessage: 'Unify your team content.',
    }),
  ],
  URL: '/app/enterprise_search/overview',
  LOGO: 'logoEnterpriseSearch',
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
  CARD_DESCRIPTION: i18n.translate('xpack.enterpriseSearch.appSearch.productCardDescription', {
    defaultMessage:
      'Elastic App Search provides user-friendly tools to design and deploy a powerful search to your websites or web/mobile applications.',
  }),
  URL: '/app/enterprise_search/app_search',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/app-search/',
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
  CARD_DESCRIPTION: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.productCardDescription',
    {
      defaultMessage:
        "Unify all your team's content in one place, with instant connectivity to popular productivity and collaboration tools.",
    }
  ),
  URL: '/app/enterprise_search/workplace_search',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/workplace-search/',
};

export const LICENSED_SUPPORT_URL = 'https://support.elastic.co';

export const JSON_HEADER = {
  'Content-Type': 'application/json', // This needs specific casing or Chrome throws a 415 error
  Accept: 'application/json', // Required for Enterprise Search APIs
};

export const READ_ONLY_MODE_HEADER = 'x-ent-search-read-only-mode';

export const ENGINES_PAGE_SIZE = 10;
