/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startsWith } from 'lodash';
import { kfetch, KFetchOptions } from 'ui/kfetch';
import { KFetchKibanaOptions } from 'ui/kfetch/kfetch';

function fetchOptionsWithDebug(fetchOptions: KFetchOptions) {
  const debugEnabled =
    sessionStorage.getItem('apm_debug') === 'true' &&
    startsWith(fetchOptions.pathname, '/api/apm');

  if (!debugEnabled) {
    return fetchOptions;
  }

  return {
    ...fetchOptions,
    query: {
      ...fetchOptions.query,
      _debug: true
    }
  };
}

const cache = new Map();

export function _clearCache() {
  cache.clear();
}

export async function callApi<T = void>(
  fetchOptions: KFetchOptions,
  options?: KFetchKibanaOptions
): Promise<T> {
  const cacheKey = JSON.stringify(fetchOptions);
  const cacheResponse = cache.get(cacheKey);
  if (cacheResponse) {
    return cacheResponse;
  }

  const combinedFetchOptions = fetchOptionsWithDebug(fetchOptions);
  const res = await kfetch(combinedFetchOptions, options);

  if (isCachable(fetchOptions)) {
    cache.set(cacheKey, res);
  }

  return res;
}

function isCachable(fetchOptions: KFetchOptions) {
  const end = fetchOptions.query && fetchOptions.query.end;

  // do not cache items where the `end` param is in the future
  return (
    end === undefined ||
    (typeof end === 'string' && new Date(end).getTime() < Date.now())
  );
}
