/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from 'kibana/public';
import { parseEndpoint } from '../../../common/apm_api/parse_endpoint';
import { FetchOptions } from '../../../common/fetch_options';
import { callApi } from './callApi';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { APMAPI } from '../../../server/routes/create_apm_api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { Client } from '../../../server/routes/typings';

export type APMClient = Client<APMAPI['_S']>;
export type AutoAbortedAPMClient = Client<APMAPI['_S'], { abortable: false }>;

export type APMClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  endpoint: string;
  signal: AbortSignal | null;
  params?: {
    body?: any;
    query?: Record<string, any>;
    path?: Record<string, any>;
  };
};

export let callApmApi: APMClient = () => {
  throw new Error(
    'callApmApi has to be initialized before used. Call createCallApmApi first.'
  );
};

export function createCallApmApi(core: CoreStart | CoreSetup) {
  callApmApi = ((options: APMClientOptions) => {
    const { endpoint, params, ...opts } = options;
    const { method, pathname } = parseEndpoint(endpoint, params?.path);

    return callApi(core, {
      ...opts,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
    });
  }) as APMClient;
}

// infer return type from API
export type APIReturnType<
  TPath extends keyof APMAPI['_S']
> = APMAPI['_S'][TPath] extends { ret: any }
  ? APMAPI['_S'][TPath]['ret']
  : unknown;
