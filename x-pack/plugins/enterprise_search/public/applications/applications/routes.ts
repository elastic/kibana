/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROOT_PATH = '/';

export const SEARCH_APPLICATIONS_PATH = `${ROOT_PATH}search_applications`;

export enum SearchApplicationViewTabs {
  DOCS_EXPLORER = 'docs_explorer',
  CONTENT = 'content',
  CONNECT = 'connect',
}
export const SEARCH_APPLICATION_CREATION_PATH = `${SEARCH_APPLICATIONS_PATH}/new`;
export const SEARCH_APPLICATION_PATH = `${SEARCH_APPLICATIONS_PATH}/:searchApplicationName`;
export const SEARCH_APPLICATION_TAB_PATH = `${SEARCH_APPLICATION_PATH}/:tabId`;
export const PLAYGROUND_PATH = `${ROOT_PATH}playground/`;
export const PLAYGROUND_CHAT_PATH = `${PLAYGROUND_PATH}chat`;
export const PLAYGROUND_SEARCH_PATH = `${PLAYGROUND_PATH}search`;

export const SEARCH_APPLICATION_CONNECT_PATH = `${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONNECT}/:connectTabId`;
export enum SearchApplicationConnectTabs {
  SEARCHAPI = 'search_api',
  DOCUMENTATION = 'documentation',
}
export const SEARCH_APPLICATION_CONTENT_PATH = `${SEARCH_APPLICATION_PATH}/${SearchApplicationViewTabs.CONTENT}/:contentTabId`;
export enum SearchApplicationContentTabs {
  INDICES = 'indices',
  SCHEMA = 'schema',
}
