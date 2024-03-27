/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '@kbn/search-connectors';

import { ProductFeatures } from './types';

export const SEARCH_PRODUCT_NAME = i18n.translate('xpack.enterpriseSearch.search.productName', {
  defaultMessage: 'Search',
});
export const ENTERPRISE_SEARCH_PRODUCT_NAME = i18n.translate('xpack.enterpriseSearch.productName', {
  defaultMessage: 'Enterprise Search',
});

export const ENTERPRISE_SEARCH_OVERVIEW_PLUGIN = {
  ID: 'enterpriseSearch',
  NAME: SEARCH_PRODUCT_NAME,
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
  NAME: SEARCH_PRODUCT_NAME,
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

export const AI_SEARCH_PLUGIN = {
  ID: 'enterpriseSearchAISearch',
  NAME: i18n.translate('xpack.enterpriseSearch.aiSearch.productName', {
    defaultMessage: 'AI Search',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.aiSearch.navTitle', {
    defaultMessage: 'AI Search',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.aiSearch.description', {
    defaultMessage:
      'Toolkit for enabling developers to build AI search-powered applications using the Elastic platform.',
  }),
  URL: '/app/enterprise_search/ai_search',
  LOGO: 'logoEnterpriseSearch',
};

export const ANALYTICS_PLUGIN = {
  ID: 'enterpriseSearchAnalytics',
  NAME: i18n.translate('xpack.enterpriseSearch.analytics.productName', {
    defaultMessage: 'Behavioral Analytics',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.analytics.productDescription', {
    defaultMessage:
      'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications.',
  }),
  CARD_DESCRIPTION: i18n.translate('xpack.enterpriseSearch.analytics.productCardDescription', {
    defaultMessage:
      'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications.',
  }),
  URL: '/app/enterprise_search/analytics',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
};

export const ELASTICSEARCH_PLUGIN = {
  ID: 'enterpriseSearchElasticsearch',
  NAME: i18n.translate('xpack.enterpriseSearch.elasticsearch.productName', {
    defaultMessage: 'Elasticsearch',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.elasticsearch.productDescription', {
    defaultMessage: 'Low-level tools for creating performant and relevant search experiences.',
  }),
  URL: '/app/enterprise_search/elasticsearch',
  SUPPORT_URL: 'https://discuss.elastic.co/c/elastic-stack/elasticsearch/',
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
  URL: '/app/enterprise_search/workplace_search',
  NON_ADMIN_URL: '/app/enterprise_search/workplace_search/p',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/workplace-search/',
};

export const SEARCH_EXPERIENCES_PLUGIN = {
  ID: 'searchExperiences',
  NAME: i18n.translate('xpack.enterpriseSearch.searchExperiences.productName', {
    defaultMessage: 'Search Experiences',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.searchExperiences.navTitle', {
    defaultMessage: 'Search Experiences',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.searchExperiences.productDescription', {
    defaultMessage: 'Build an intuitive, engaging search experience without reinventing the wheel.',
  }),
  URL: '/app/enterprise_search/search_experiences',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
  GITHUB_URL: 'https://github.com/elastic/search-ui/',
  DOCUMENTATION_URL: 'https://docs.elastic.co/search-ui/',
  ELASTICSEARCH_TUTORIAL_URL: 'https://docs.elastic.co/search-ui/tutorials/elasticsearch',
  APP_SEARCH_TUTORIAL_URL: 'https://docs.elastic.co/search-ui/tutorials/app-search',
  WORKPLACE_SEARCH_TUTORIAL_URL: 'https://docs.elastic.co/search-ui/tutorials/workplace-search',
};

export const APPLICATIONS_PLUGIN = {
  ID: 'enterpriseSearchApplications',
  LOGO: 'logoEnterpriseSearch',
  NAME: i18n.translate('xpack.enterpriseSearch.applications.productName', {
    defaultMessage: 'Applications',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.applications.navTitle', {
    defaultMessage: 'Search Applications',
  }),
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
  URL: '/app/enterprise_search/applications',
};

export const VECTOR_SEARCH_PLUGIN = {
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.vectorSearch.description', {
    defaultMessage:
      'Elasticsearch can be used as a vector database, which enables vector search and semantic search use cases.',
  }),
  ID: 'enterpriseSearchVectorSearch',
  LOGO: 'logoEnterpriseSearch',
  NAME: i18n.translate('xpack.enterpriseSearch.vectorSearch.productName', {
    defaultMessage: 'Vector Search',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.vectorSearch.navTitle', {
    defaultMessage: 'Vector Search',
  }),
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
  URL: '/app/enterprise_search/vector_search',
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
export const ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID = 'ent-search-analytics-logs';

export const APP_SEARCH_URL = '/app/enterprise_search/app_search';
export const ENTERPRISE_SEARCH_ELASTICSEARCH_URL = '/app/enterprise_search/elasticsearch';
export const WORKPLACE_SEARCH_URL = '/app/enterprise_search/workplace_search';
export const CREATE_NEW_INDEX_URL = '/search_indices/new_index';

export const ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT = 25;

export const ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE = 'elastic-crawler';

export const DEFAULT_PIPELINE_NAME = 'ent-search-generic-ingestion';
export const DEFAULT_PIPELINE_VALUES: IngestPipelineParams = {
  extract_binary_content: true,
  name: DEFAULT_PIPELINE_NAME,
  reduce_whitespace: true,
  run_ml_inference: true,
};

export interface DefaultConnectorsPipelineMeta {
  default_extract_binary_content: boolean;
  default_name: string;
  default_reduce_whitespace: boolean;
  default_run_ml_inference: boolean;
}

export const defaultConnectorsPipelineMeta: DefaultConnectorsPipelineMeta = {
  default_extract_binary_content: DEFAULT_PIPELINE_VALUES.extract_binary_content,
  default_name: DEFAULT_PIPELINE_NAME,
  default_reduce_whitespace: DEFAULT_PIPELINE_VALUES.reduce_whitespace,
  default_run_ml_inference: DEFAULT_PIPELINE_VALUES.run_ml_inference,
};

export enum INGESTION_METHOD_IDS {
  API = 'api',
  CONNECTOR = 'connector',
  CRAWLER = 'crawler',
}

export const DEFAULT_PRODUCT_FEATURES: ProductFeatures = {
  hasConnectors: true,
  hasDefaultIngestPipeline: true,
  hasDocumentLevelSecurityEnabled: true,
  hasIncrementalSyncEnabled: true,
  hasNativeConnectors: true,
  hasWebCrawler: true,
};

export const CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX = '.search-acl-filter-';
export const PLUGIN_ID = 'enterpriseSearch';

export const CONNECTOR_NATIVE_TYPE = 'native';
export const CONNECTOR_CLIENTS_TYPE = 'connector_clients';
