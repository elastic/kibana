/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { docLinks } from '../shared/doc_links';

export const API_DOCS_URL = docLinks.appSearchApis;
export const API_CLIENTS_DOCS_URL = docLinks.appSearchApiClients;
export const API_KEYS_DOCS_URL = docLinks.appSearchApiKeys;
export const AUTHENTICATION_DOCS_URL = docLinks.appSearchAuthentication;
export const CRAWL_RULES_DOCS_URL = docLinks.appSearchCrawlRules;
export const CURATIONS_DOCS_URL = docLinks.appSearchCurations;
export const DOCS_URL = docLinks.appSearchGuide;
export const DUPLICATE_DOCS_URL = docLinks.appSearchDuplicateDocuments;
export const ENTRY_POINTS_DOCS_URL = docLinks.appSearchEntryPoints;
export const INDEXING_DOCS_URL = docLinks.appSearchIndexingDocs;
export const INDEXING_SCHEMA_DOCS_URL = docLinks.appSearchIndexingDocsSchema;
export const LOG_SETTINGS_DOCS_URL = docLinks.appSearchLogSettings;
export const META_ENGINES_DOCS_URL = docLinks.appSearchMetaEngines;
export const PRECISION_DOCS_URL = docLinks.appSearchPrecision;
export const RELEVANCE_DOCS_URL = docLinks.appSearchRelevance;
export const RESULT_SETTINGS_DOCS_URL = docLinks.appSearchResultSettings;
export const SEARCH_UI_DOCS_URL = docLinks.appSearchSearchUI;
export const SECURITY_DOCS_URL = docLinks.appSearchSecurity;
export const SYNONYMS_DOCS_URL = docLinks.appSearchSynonyms;
export const WEB_CRAWLER_DOCS_URL = docLinks.appSearchWebCrawler;
export const WEB_CRAWLER_LOG_DOCS_URL = docLinks.appSearchWebCrawlerEventLogs;

export const ROOT_PATH = '/';
export const SETUP_GUIDE_PATH = '/setup_guide';
export const LIBRARY_PATH = '/library';
export const SETTINGS_PATH = '/settings';
export const CREDENTIALS_PATH = '/credentials';

export const USERS_AND_ROLES_PATH = '/users_and_roles';

export const ENGINES_PATH = '/engines';
export const ENGINE_CREATION_PATH = `${ENGINES_PATH}/new`; // This is safe from conflicting with an :engineName path because new is a reserved name
export const ENGINE_PATH = `${ENGINES_PATH}/:engineName`;

export const ENGINE_ANALYTICS_PATH = `${ENGINE_PATH}/analytics`;
export const ENGINE_ANALYTICS_TOP_QUERIES_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries`;
export const ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries_no_clicks`;
export const ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries_no_results`;
export const ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries_with_clicks`;
export const ENGINE_ANALYTICS_RECENT_QUERIES_PATH = `${ENGINE_ANALYTICS_PATH}/recent_queries`;
export const ENGINE_ANALYTICS_QUERY_DETAILS_PATH = `${ENGINE_ANALYTICS_PATH}/query_detail`;
export const ENGINE_ANALYTICS_QUERY_DETAIL_PATH = `${ENGINE_ANALYTICS_QUERY_DETAILS_PATH}/:query`;

export const ENGINE_DOCUMENTS_PATH = `${ENGINE_PATH}/documents`;
export const ENGINE_DOCUMENT_DETAIL_PATH = `${ENGINE_DOCUMENTS_PATH}/:documentId`;

export const ENGINE_SCHEMA_PATH = `${ENGINE_PATH}/schema`;
export const ENGINE_REINDEX_JOB_PATH = `${ENGINE_SCHEMA_PATH}/reindex_job/:reindexJobId`;

export const ENGINE_CRAWLER_PATH = `${ENGINE_PATH}/crawler`;
export const ENGINE_CRAWLER_DOMAIN_PATH = `${ENGINE_CRAWLER_PATH}/domains/:domainId`;

export const META_ENGINE_CREATION_PATH = `${ENGINES_PATH}/new_meta_engine`; // This is safe from conflicting with an :engineName path because engine names cannot have underscores
export const META_ENGINE_SOURCE_ENGINES_PATH = `${ENGINE_PATH}/engines`;

export const ENGINE_RELEVANCE_TUNING_PATH = `${ENGINE_PATH}/relevance_tuning`;
export const ENGINE_SYNONYMS_PATH = `${ENGINE_PATH}/synonyms`;
export const ENGINE_RESULT_SETTINGS_PATH = `${ENGINE_PATH}/result_settings`;

export const ENGINE_CURATIONS_PATH = `${ENGINE_PATH}/curations`;
export const ENGINE_CURATIONS_NEW_PATH = `${ENGINE_CURATIONS_PATH}/new`;
export const ENGINE_CURATION_PATH = `${ENGINE_CURATIONS_PATH}/:curationId`;
export const ENGINE_CURATION_SUGGESTION_PATH = `${ENGINE_CURATIONS_PATH}/suggestions/:query`;

export const ENGINE_SEARCH_UI_PATH = `${ENGINE_PATH}/search_ui`;
export const ENGINE_API_LOGS_PATH = `${ENGINE_PATH}/api_logs`;
