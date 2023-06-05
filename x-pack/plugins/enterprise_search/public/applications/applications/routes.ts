/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROOT_PATH = '/';

export const ENGINES_PATH = `${ROOT_PATH}search_applications`;

export enum EngineViewTabs {
  PREVIEW = 'preview',
  CONTENT = 'content',
  CONNECT = 'connect',
}
export const ENGINE_CREATION_PATH = `${ENGINES_PATH}/new`;
export const ENGINE_PATH = `${ENGINES_PATH}/:engineName`;
export const ENGINE_TAB_PATH = `${ENGINE_PATH}/:tabId`;
export const SEARCH_APPLICATION_CONNECT_PATH = `${ENGINE_PATH}/${EngineViewTabs.CONNECT}/:connectTabId`;
export enum SearchApplicationConnectTabs {
  API = 'api',
  DOCUMENTATION = 'documentation',
}
export const SEARCH_APPLICATION_CONTENT_PATH = `${ENGINE_PATH}/${EngineViewTabs.CONTENT}/:contentTabId`;
export enum SearchApplicationContentTabs {
  INDICES = 'indices',
  SCHEMA = 'schema',
}
