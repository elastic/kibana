/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import { FetchOptions } from '..';

function getFetchOptions(fetchOptions: FetchOptions) {
  const { body, ...rest } = fetchOptions;

  return {
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    query: {
      ...fetchOptions.query,
    },
  };
}

export type CallApi = typeof callApi;

export async function callApi<T = void>(
  { http }: CoreStart | CoreSetup,
  fetchOptions: FetchOptions
): Promise<T> {
  const { pathname, method = 'get', ...options } = getFetchOptions(fetchOptions);

  const lowercaseMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

  const res = await http[lowercaseMethod]<T>(pathname, options);

  return res;
}
