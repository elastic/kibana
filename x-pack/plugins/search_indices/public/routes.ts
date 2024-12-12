/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROOT_PATH = '/';
export const SEARCH_INDICES_DETAILS_PATH = `${ROOT_PATH}index_details/:indexName`;
export const SEARCH_INDICES_DETAILS_TABS_PATH = `${SEARCH_INDICES_DETAILS_PATH}/:tabId`;
export enum SearchIndexDetailsTabs {
  DATA = 'data',
  MAPPINGS = 'mappings',
  SETTINGS = 'settings',
}
export const CREATE_INDEX_PATH = `${ROOT_PATH}create`;

export const SearchIndexDetailsTabValues: string[] = Object.values(SearchIndexDetailsTabs);
export const START_APP_BASE = '/app/elasticsearch/start';
export const INDICES_APP_BASE = '/app/elasticsearch/indices';
