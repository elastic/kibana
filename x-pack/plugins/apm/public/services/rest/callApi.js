/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'isomorphic-fetch';
import { camelizeKeys } from 'humps';
import { kfetch } from 'ui/kfetch';
import { startsWith } from 'lodash';

function fetchOptionsWithDebug(fetchOptions) {
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

export async function callApi(fetchOptions, kibanaOptions) {
  const combinedKibanaOptions = {
    camelcase: true,
    ...kibanaOptions
  };

  const combinedFetchOptions = fetchOptionsWithDebug(fetchOptions);
  const res = await kfetch(combinedFetchOptions, combinedKibanaOptions);
  return combinedKibanaOptions.camelcase ? camelizeKeys(res) : res;
}
