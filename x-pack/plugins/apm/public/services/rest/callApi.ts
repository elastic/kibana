/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString, startsWith } from 'lodash';
import LRU from 'lru-cache';
import hash from 'object-hash';
import { HttpSetup, HttpFetchOptions } from 'kibana/public';

export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  pathname: string;
  isCachable?: boolean;
  method?: string;
  body?: any;
};

function fetchOptionsWithDebug(fetchOptions: FetchOptions) {
  const debugEnabled =
    sessionStorage.getItem('apm_debug') === 'true' &&
    startsWith(fetchOptions.pathname, '/api/apm');

  const { body, ...rest } = fetchOptions;

  return {
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    query: {
      ...fetchOptions.query,
      ...(debugEnabled ? { _debug: true } : {}),
    },
  };
}

const cache = new LRU<string, any>({ max: 100, maxAge: 1000 * 60 * 60 });

export function clearCache() {
  cache.reset();
}

export type CallApi = typeof callApi;

export async function callApi<T = void>(
  http: HttpSetup,
  fetchOptions: FetchOptions
): Promise<T> {
  const cacheKey = getCacheKey(fetchOptions);
  const cacheResponse = cache.get(cacheKey);
  if (cacheResponse) {
    return cacheResponse;
  }

  const { pathname, method = 'get', ...options } = fetchOptionsWithDebug(
    fetchOptions
  );

  const lowercaseMethod = method.toLowerCase() as
    | 'get'
    | 'post'
    | 'put'
    | 'delete'
    | 'patch';

  const res = await http[lowercaseMethod](pathname, options);

  if (isCachable(fetchOptions)) {
    cache.set(cacheKey, res);
  }

  return res;
}

// only cache items that has a time range with `start` and `end` params,
// and where `end` is not a timestamp in the future
function isCachable(fetchOptions: FetchOptions) {
  if (fetchOptions.isCachable !== undefined) {
    return fetchOptions.isCachable;
  }

  if (
    !(fetchOptions.query && fetchOptions.query.start && fetchOptions.query.end)
  ) {
    return false;
  }

  return (
    isString(fetchOptions.query.end) &&
    new Date(fetchOptions.query.end).getTime() < Date.now()
  );
}

// order the options object to make sure that two objects with the same arguments, produce produce the
// same cache key regardless of the order of properties
function getCacheKey(options: FetchOptions) {
  return hash(options);
}
