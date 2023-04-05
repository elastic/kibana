/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROOT_PATH = '/';

export const SEARCH_APPLICATIONS_PATH = `${ROOT_PATH}search_applications`;

export const SEARCH_APPLICATION_PATH = `${SEARCH_APPLICATIONS_PATH}/:searchApplicationName`;
export const SEARCH_APPLICATION_TAB_PATH = `${SEARCH_APPLICATION_PATH}/:tabId`;
export enum SearchApplicationViewTabs {
  OVERVIEW = 'overview',
  INDICES = 'indices',
  SCHEMA = 'schema',
  PREVIEW = 'preview',
  API = 'api',
}
