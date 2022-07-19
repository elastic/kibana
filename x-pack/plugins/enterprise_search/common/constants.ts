/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENTERPRISE_SEARCH_OVERVIEW_PLUGIN = {
  ID: 'enterpriseSearch',
  NAME: i18n.translate('xpack.enterpriseSearch.overview.productName', {
    defaultMessage: 'Enterprise Search',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.overview.navTitle', {
    defaultMessage: 'Overview',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.overview.description', {
    defaultMessage: 'Create search experiences with a refined set of APIs and tools.',
  }),
  URL: '/app/enterprise_search/overview',
  LOGO: 'logoEnterpriseSearch',
};

export const ENTERPRISE_SEARCH_CONTENT_PLUGIN = {
  ID: 'enterpriseSearchContent',
  NAME: i18n.translate('xpack.enterpriseSearch.content.productName', {
    defaultMessage: 'Enterprise Search',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.content.navTitle', {
    defaultMessage: 'Content',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.content.description', {
    defaultMessage:
      'Enterprise search offers a number of ways to easily make your data searchable. Choose from the web crawler, Elasticsearch indices, API, direct uploads, or thrid party connectors.', // TODO: Make sure this content is correct.
  }),
  URL: '/app/enterprise_search/content',
  LOGO: 'logoEnterpriseSearch',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
};

export const ELASTICSEARCH_PLUGIN = {
  ID: 'elasticsearch',
  NAME: i18n.translate('xpack.enterpriseSearch.elasticsearch.productName', {
    defaultMessage: 'Elasticsearch',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.elasticsearch.productDescription', {
    defaultMessage: 'Low-level tools for creating performant and relevant search experiences.',
  }),
  CARD_DESCRIPTION: i18n.translate('xpack.enterpriseSearch.elasticsearch.productCardDescription', {
    defaultMessage:
      'Ideal for bespoke applications, Elasticsearch helps you build highly customizable search and offers many different ingestion methods.',
  }),
  URL: '/app/enterprise_search/elasticsearch',
  SUPPORT_URL: 'https://discuss.elastic.co/c/elastic-stack/elasticsearch/',
  ICON: 'logoElasticsearch',
  PRODUCT_CARD_CTA: i18n.translate('xpack.enterpriseSearch.elasticsearch.productCardCTA', {
    defaultMessage: 'View the setup guide',
  }),
  FEATURES: [
    i18n.translate('xpack.enterpriseSearch.elasticsearch.features.one', {
      defaultMessage: 'Integrate with databases, websites, and more',
    }),
    i18n.translate('xpack.enterpriseSearch.elasticsearch.features.two', {
      defaultMessage: 'Build custom tooling',
    }),
    i18n.translate('xpack.enterpriseSearch.elasticsearch.features.three', {
      defaultMessage: 'Build custom search experiences',
    }),
  ],
  RESOURCE_LINKS: [
    {
      label: i18n.translate('xpack.enterpriseSearch.elasticsearch.resourceLabel.one', {
        defaultMessage: 'Getting started with Elasticsearch',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.elasticsearch.resourceLabel.two', {
        defaultMessage: 'Create a new index',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.elasticsearch.resourceLabel.three', {
        defaultMessage: 'Set up a language client',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.elasticsearch.resourceLabel.four', {
        defaultMessage: 'Search UI for Elasticsearch',
      }),
      to: 'https://google.com',
    },
  ],
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
      'Ideal dor apps and websites, App Search helps you design, deploy, and manage powerful search experiences.',
  }),
  URL: '/app/enterprise_search/app_search',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/app-search/',
  ICON: 'logoAppSearch',
  PRODUCT_CARD_CTA: i18n.translate('xpack.enterpriseSearch.appSearch.productCardCTA', {
    defaultMessage: 'Open App Search',
  }),
  FEATURES: [
    i18n.translate('xpack.enterpriseSearch.appSearch.features.one', {
      defaultMessage: 'Ingest with a web crawler, API, or Elasticsearch',
    }),
    i18n.translate('xpack.enterpriseSearch.appSearch.features.two', {
      defaultMessage: 'Search management dashboards',
    }),
    i18n.translate('xpack.enterpriseSearch.appSearch.features.three', {
      defaultMessage: 'Search-optimized APIs',
    }),
  ],
  RESOURCE_LINKS: [
    {
      label: i18n.translate('xpack.enterpriseSearch.appSearch.resourceLabel.one', {
        defaultMessage: 'Getting started with App Search',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.appSearch.resourceLabel.two', {
        defaultMessage: 'Search UI for App Search',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.appSearch.resourceLabel.three', {
        defaultMessage: 'Tune your search relevance',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.appSearch.resourceLabel.four', {
        defaultMessage: 'Automate with Adaptive Relevance',
      }),
      to: 'https://google.com',
    },
  ],
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
        'Ideal for internal teams, Workplace Search helps unify your content in one place with instant connectivity to popular productivity tools.',
    }
  ),
  URL: '/app/enterprise_search/workplace_search',
  NON_ADMIN_URL: '/app/enterprise_search/workplace_search/p',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/workplace-search/',
  ICON: 'logoWorkplaceSearch',
  PRODUCT_CARD_CTA: i18n.translate('xpack.enterpriseSearch.workplaceSearch.productCardCTA', {
    defaultMessage: 'Open Workplace Search',
  }),
  FEATURES: [
    i18n.translate('xpack.enterpriseSearch.workplaceSearch.features.one', {
      defaultMessage: 'Ingest from third-party sources',
    }),
    i18n.translate('xpack.enterpriseSearch.workplaceSearch.features.two', {
      defaultMessage: 'Search management dashboards',
    }),
    i18n.translate('xpack.enterpriseSearch.workplaceSearch.features.three', {
      defaultMessage: 'Search experiences for authenticated users',
    }),
  ],
  RESOURCE_LINKS: [
    {
      label: i18n.translate('xpack.enterpriseSearch.workplaceSearch.resourceLabel.one', {
        defaultMessage: 'Getting started with Workplace Search',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.workplaceSearch.resourceLabel.two', {
        defaultMessage: 'Set up your connectors',
      }),
      to: 'https://google.com',
    },
    {
      label: i18n.translate('xpack.enterpriseSearch.workplaceSearch.resourceLabel.three', {
        defaultMessage: 'Manage permissions',
      }),
      to: 'https://google.com',
    },
  ],
};

export const LICENSED_SUPPORT_URL = 'https://support.elastic.co';

export const JSON_HEADER = {
  'Content-Type': 'application/json', // This needs specific casing or Chrome throws a 415 error
  Accept: 'application/json', // Required for Enterprise Search APIs
};

export const ERROR_CONNECTING_HEADER = 'x-ent-search-error-connecting';
export const READ_ONLY_MODE_HEADER = 'x-ent-search-read-only-mode';

export const ENTERPRISE_SEARCH_KIBANA_COOKIE = '_enterprise_search';

export const ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID = 'ent-search-logs';
export const ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID = 'ent-search-audit-logs';
