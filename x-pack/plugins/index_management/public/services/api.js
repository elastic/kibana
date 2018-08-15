/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';

const apiPrefix = '/api/index_management';

export async function loadIndices() {
  return await kfetch({
    pathname: `${apiPrefix}/indices`,
    method: 'GET',
  });
}

export async function reloadIndices(indexNames) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/reload`,
    method: 'POST',
    body: JSON.stringify({ indexNames }),
  });
}

export async function closeIndices(indices) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/close`,
    method: 'POST',
    body: JSON.stringify({ indices }),
  });
}

export async function deleteIndices(indices) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/delete`,
    method: 'POST',
    body: JSON.stringify({ indices }),
  });
}

export async function openIndices(indices) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/open`,
    method: 'POST',
    body: JSON.stringify({ indices }),
  });
}

export async function refreshIndices(indices) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/refresh`,
    method: 'POST',
    body: JSON.stringify({ indices }),
  });
}

export async function flushIndices(indices) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/flush`,
    method: 'POST',
    body: JSON.stringify({ indices }),
  });
}

export async function forcemergeIndices(indices, maxNumSegments) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/forcemerge`,
    method: 'POST',
    body: JSON.stringify({
      indices,
      maxNumSegments
    }),
  });
}

export async function clearCacheIndices(indices) {
  return await kfetch({
    pathname: `${apiPrefix}/indices/clear_cache`,
    method: 'POST',
    body: JSON.stringify({ indices }),
  });
}

export async function loadIndexSettings(indexName) {
  return await kfetch({
    pathname: `${apiPrefix}/settings/${indexName}`,
    method: 'GET',
  });
}

export async function updateIndexSettings(indexName, settings) {
  return await kfetch({
    pathname: `${apiPrefix}/settings/${indexName}`,
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function loadIndexStats(indexName) {
  return await kfetch({
    pathname: `${apiPrefix}/stats/${indexName}`,
    method: 'GET',
  });
}

export async function loadIndexMapping(indexName) {
  return await kfetch({
    pathname: `${apiPrefix}/mapping/${indexName}`,
    method: 'GET',
  });
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
