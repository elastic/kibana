/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import {
  UA_UPDATE_SETTINGS,
  UA_INDEX_CLEAR_CACHE,
  UA_INDEX_CLEAR_CACHE_MANY,
  UA_INDEX_CLOSE,
  UA_INDEX_CLOSE_MANY,
  UA_INDEX_DELETE,
  UA_INDEX_DELETE_MANY,
  UA_INDEX_FLUSH,
  UA_INDEX_FLUSH_MANY,
  UA_INDEX_FORCE_MERGE,
  UA_INDEX_FORCE_MERGE_MANY,
  UA_INDEX_FREEZE,
  UA_INDEX_FREEZE_MANY,
  UA_INDEX_OPEN,
  UA_INDEX_OPEN_MANY,
  UA_INDEX_REFRESH,
  UA_INDEX_REFRESH_MANY,
  UA_INDEX_UNFREEZE,
  UA_INDEX_UNFREEZE_MANY,
} from '../../common/constants';

import {
  TAB_SETTINGS,
  TAB_MAPPING,
  TAB_STATS,
} from '../constants';

import { trackUserAction } from './track_user_action';

let httpClient;

export const setHttpClient = (client) => {
  httpClient = client;
};

export const getHttpClient = () => {
  return httpClient;
};

const apiPrefix = chrome.addBasePath('/api/index_management');

export async function loadIndices() {
  const response = await httpClient.get(`${apiPrefix}/indices`);
  return response.data;
}

export async function reloadIndices(indexNames) {
  const body = {
    indexNames
  };
  const response = await httpClient.post(`${apiPrefix}/indices/reload`, body);
  return response.data;
}

export async function closeIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/close`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_CLOSE_MANY : UA_INDEX_CLOSE;
  trackUserAction(actionType);
  return response.data;
}

export async function deleteIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/delete`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_DELETE_MANY : UA_INDEX_DELETE;
  trackUserAction(actionType);
  return response.data;
}

export async function openIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/open`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_OPEN_MANY : UA_INDEX_OPEN;
  trackUserAction(actionType);
  return response.data;
}

export async function refreshIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/refresh`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_REFRESH_MANY : UA_INDEX_REFRESH;
  trackUserAction(actionType);
  return response.data;
}

export async function flushIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/flush`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_FLUSH_MANY : UA_INDEX_FLUSH;
  trackUserAction(actionType);
  return response.data;
}

export async function forcemergeIndices(indices, maxNumSegments) {
  const body = {
    indices,
    maxNumSegments
  };
  const response = await httpClient.post(`${apiPrefix}/indices/forcemerge`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_FORCE_MERGE_MANY : UA_INDEX_FORCE_MERGE;
  trackUserAction(actionType);
  return response.data;
}

export async function clearCacheIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/clear_cache`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_CLEAR_CACHE_MANY : UA_INDEX_CLEAR_CACHE;
  trackUserAction(actionType);
  return response.data;
}
export async function freezeIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/freeze`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_FREEZE_MANY : UA_INDEX_FREEZE;
  trackUserAction(actionType);
  return response.data;
}
export async function unfreezeIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/unfreeze`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UA_INDEX_UNFREEZE_MANY : UA_INDEX_UNFREEZE;
  trackUserAction(actionType);
  return response.data;
}

export async function loadIndexSettings(indexName) {
  const response = await httpClient.get(`${apiPrefix}/settings/${indexName}`);
  return response.data;
}

export async function updateIndexSettings(indexName, settings) {
  const response = await httpClient.put(`${apiPrefix}/settings/${indexName}`, settings);
  // Only track successful requests.
  trackUserAction(UA_UPDATE_SETTINGS);
  return response;
}

export async function loadIndexStats(indexName) {
  const response = await httpClient.get(`${apiPrefix}/stats/${indexName}`);
  return response.data;
}

export async function loadIndexMapping(indexName) {
  const response = await httpClient.get(`${apiPrefix}/mapping/${indexName}`);
  return response.data;
}

export async function loadIndexData(type, indexName) {
  switch (type) {
    case TAB_MAPPING:
      return loadIndexMapping(indexName);

    case TAB_SETTINGS:
      return loadIndexSettings(indexName);

    case TAB_STATS:
      return loadIndexStats(indexName);
  }
}
