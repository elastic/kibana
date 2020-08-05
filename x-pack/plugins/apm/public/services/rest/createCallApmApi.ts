/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';
import { callApi, FetchOptions } from './callApi';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { APMAPI } from '../../../server/routes/create_apm_api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Client, HttpMethod } from '../../../server/routes/typings';

export type APMClient = Client<APMAPI['_S']>;
export type APMClientOptions = Omit<FetchOptions, 'query' | 'body'> & {
  params?: {
    body?: any;
    query?: any;
    path?: any;
  };
};

export let callApmApi: APMClient = () => {
  throw new Error(
    'callApmApi has to be initialized before used. Call createCallApmApi first.'
  );
};

export function createCallApmApi(http: HttpSetup) {
  callApmApi = ((options: APMClientOptions) => {
    const { pathname, params = {}, ...opts } = options;

    const path = (params.path || {}) as Record<string, any>;

    const formattedPathname = Object.keys(path).reduce((acc, paramName) => {
      return acc.replace(`{${paramName}}`, path[paramName]);
    }, pathname);

    return callApi(http, {
      ...opts,
      pathname: formattedPathname,
      body: params.body,
      query: params.query,
    });
  }) as APMClient;
}

// infer return type from API
export type APIReturnType<
  TPath extends keyof APMAPI['_S'],
  TMethod extends HttpMethod = 'GET'
> = APMAPI['_S'][TPath] extends { [key in TMethod]: { ret: any } }
  ? APMAPI['_S'][TPath][TMethod]['ret']
  : unknown;
