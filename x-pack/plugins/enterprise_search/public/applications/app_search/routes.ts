/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';

import { CURRENT_MAJOR_VERSION } from '../../../common/version';

export const DOCS_PREFIX = `https://www.elastic.co/guide/en/app-search/${CURRENT_MAJOR_VERSION}`;

export const ROOT_PATH = '/';
export const SETUP_GUIDE_PATH = '/setup_guide';
export const LIBRARY_PATH = '/library';
export const SETTINGS_PATH = '/settings/account';
export const CREDENTIALS_PATH = '/credentials';
export const ROLE_MAPPINGS_PATH = '#/role-mappings'; // This page seems to 404 if the # isn't included

export const ENGINES_PATH = '/engines';
export const CREATE_ENGINES_PATH = `${ENGINES_PATH}/new`;

export const ENGINE_PATH = '/engines/:engineName';
export const SAMPLE_ENGINE_PATH = '/engines/national-parks-demo';
export const getEngineRoute = (engineName: string) => generatePath(ENGINE_PATH, { engineName });

export const ENGINE_ANALYTICS_PATH = '/analytics';
export const ENGINE_ANALYTICS_TOP_QUERIES_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries`;
export const ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries_no_clicks`;
export const ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries_no_results`;
export const ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH = `${ENGINE_ANALYTICS_PATH}/top_queries_with_clicks`;
export const ENGINE_ANALYTICS_RECENT_QUERIES_PATH = `${ENGINE_ANALYTICS_PATH}/recent_queries`;
export const ENGINE_ANALYTICS_QUERY_DETAILS_PATH = `${ENGINE_ANALYTICS_PATH}/query_detail`;
export const ENGINE_ANALYTICS_QUERY_DETAIL_PATH = `${ENGINE_ANALYTICS_QUERY_DETAILS_PATH}/:query`;

export const ENGINE_DOCUMENTS_PATH = '/documents';
export const ENGINE_DOCUMENT_DETAIL_PATH = `${ENGINE_DOCUMENTS_PATH}/:documentId`;
export const getDocumentDetailRoute = (engineName: string, documentId: string) => {
  return generatePath(ENGINE_PATH + ENGINE_DOCUMENT_DETAIL_PATH, { engineName, documentId });
};

export const ENGINE_SCHEMA_PATH = '/schema/edit';
export const ENGINE_REINDEX_JOB_PATH = '/reindex-job/:activeReindexJobId';

export const ENGINE_CRAWLER_PATH = '/crawler';
// TODO: Crawler sub-pages

export const META_ENGINE_SOURCE_ENGINES_PATH = '/engines';

export const ENGINE_RELEVANCE_TUNING_PATH = '/search-settings';
export const ENGINE_SYNONYMS_PATH = '/synonyms';
export const ENGINE_CURATIONS_PATH = '/curations';
// TODO: Curations sub-pages
export const ENGINE_RESULT_SETTINGS_PATH = '/result-settings';

export const ENGINE_SEARCH_UI_PATH = '/reference_application/new';
export const ENGINE_API_LOGS_PATH = '/api-logs';
