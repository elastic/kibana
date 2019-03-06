/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  UA_INDEX_CLEAR_CACHE,
  UA_INDEX_CLEAR_CACHE_BULK,
  UA_INDEX_DELETE,
  UA_INDEX_DELETE_BULK,
  UA_INDEX_FLUSH,
  UA_INDEX_FLUSH_BULK,
  UA_INDEX_FORCE_MERGE,
  UA_INDEX_FORCE_MERGE_BULK,
  UA_INDEX_CLOSE,
  UA_INDEX_CLOSE_BULK,
  UA_INDEX_OPEN,
  UA_INDEX_OPEN_BULK,
  UA_INDEX_FREEZE,
  UA_INDEX_FREEZE_BULK,
  UA_INDEX_UNFREEZE,
  UA_INDEX_UNFREEZE_BULK,
} from '../../common/constants';
import { trackUserRequestBulk } from './track_user_action';

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
  const request = httpClient.post(`${apiPrefix}/indices/close`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_CLOSE, UA_INDEX_CLOSE_BULK);
  return response.data;
}

export async function deleteIndices(indices) {
  const body = {
    indices
  };
  const request = httpClient.post(`${apiPrefix}/indices/delete`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_DELETE, UA_INDEX_DELETE_BULK);
  return response.data;
}

export async function openIndices(indices) {
  const body = {
    indices
  };
  const request = httpClient.post(`${apiPrefix}/indices/open`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_OPEN, UA_INDEX_OPEN_BULK);
  return response.data;
}

export async function refreshIndices(indices) {
  const body = {
    indices
  };
  const response = await httpClient.post(`${apiPrefix}/indices/refresh`, body);
  return response.data;
}

export async function flushIndices(indices) {
  const body = {
    indices
  };
  const request = httpClient.post(`${apiPrefix}/indices/flush`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_FLUSH, UA_INDEX_FLUSH_BULK);
  return response.data;
}

export async function forcemergeIndices(indices, maxNumSegments) {
  const body = {
    indices,
    maxNumSegments
  };
  const request = httpClient.post(`${apiPrefix}/indices/forcemerge`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_FORCE_MERGE, UA_INDEX_FORCE_MERGE_BULK);
  return response.data;
}

export async function clearCacheIndices(indices) {
  const body = {
    indices
  };
  const request = httpClient.post(`${apiPrefix}/indices/clear_cache`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_CLEAR_CACHE, UA_INDEX_CLEAR_CACHE_BULK);
  return response.data;
}
export async function freezeIndices(indices) {
  const body = {
    indices
  };
  const request = httpClient.post(`${apiPrefix}/indices/freeze`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_FREEZE, UA_INDEX_FREEZE_BULK);
  return response.data;
}
export async function unfreezeIndices(indices) {
  const body = {
    indices
  };
  const request = httpClient.post(`${apiPrefix}/indices/unfreeze`, body);
  const response = await trackUserRequestBulk(request, indices.length, UA_INDEX_UNFREEZE, UA_INDEX_UNFREEZE_BULK);
  return response.data;
}

export async function loadIndexSettings(indexName) {
  const response = await httpClient.get(`${apiPrefix}/settings/${indexName}`);
  return response.data;
}

export async function updateIndexSettings(indexName, settings) {
  return await httpClient.put(`${apiPrefix}/settings/${indexName}`, settings);
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
    case 'Mapping':
      return loadIndexMapping(indexName);
    case 'Settings':
      return loadIndexSettings(indexName);
    case 'Stats':
      return loadIndexStats(indexName);
  }
}
