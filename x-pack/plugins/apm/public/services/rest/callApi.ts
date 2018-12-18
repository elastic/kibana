/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelizeKeys } from 'humps';
import 'isomorphic-fetch';
import { startsWith } from 'lodash';
import { kfetch, KFetchOptions } from 'ui/kfetch';

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

export async function callApi<T = void>(
  fetchOptions: KFetchOptions,
  { camelcase = true, prependBasePath = true } = {}
): Promise<T> {
  const combinedFetchOptions = fetchOptionsWithDebug(fetchOptions);
  const res = await kfetch(combinedFetchOptions, { prependBasePath });
  return camelcase ? camelizeKeys(res) : res;
}
