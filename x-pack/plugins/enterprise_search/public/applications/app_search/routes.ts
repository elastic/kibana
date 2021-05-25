/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { docLinks } from '../shared/doc_links';

export const DOCS_PREFIX = docLinks.appSearchBase;

export const ROOT_PATH = '/';
export const SETUP_GUIDE_PATH = '/setup_guide';
export const LIBRARY_PATH = '/library';
export const SETTINGS_PATH = '/settings';
export const CREDENTIALS_PATH = '/credentials';

export const ROLE_MAPPINGS_PATH = '/role_mappings';
export const ROLE_MAPPING_PATH = `${ROLE_MAPPINGS_PATH}/:roleId`;
export const ROLE_MAPPING_NEW_PATH = `${ROLE_MAPPINGS_PATH}/new`;

export const ENGINES_PATH = '/engines';
export const ENGINE_CREATION_PATH = '/engine_creation';
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
// TODO: Crawler sub-pages

export const META_ENGINE_CREATION_PATH = '/meta_engine_creation';
export const META_ENGINE_SOURCE_ENGINES_PATH = `${ENGINE_PATH}/engines`;

export const ENGINE_RELEVANCE_TUNING_PATH = `${ENGINE_PATH}/relevance_tuning`;
export const ENGINE_SYNONYMS_PATH = `${ENGINE_PATH}/synonyms`;
export const ENGINE_RESULT_SETTINGS_PATH = `${ENGINE_PATH}/result_settings`;

export const ENGINE_CURATIONS_PATH = `${ENGINE_PATH}/curations`;
export const ENGINE_CURATIONS_NEW_PATH = `${ENGINE_CURATIONS_PATH}/new`;
export const ENGINE_CURATION_PATH = `${ENGINE_CURATIONS_PATH}/:curationId`;

export const ENGINE_SEARCH_UI_PATH = `${ENGINE_PATH}/search_ui`;
export const ENGINE_API_LOGS_PATH = `${ENGINE_PATH}/api_logs`;
