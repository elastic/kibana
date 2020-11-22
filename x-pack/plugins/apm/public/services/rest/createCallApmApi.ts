/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';
import { FetchOptions } from '../../../common/fetch_options';
import { callApi } from './callApi';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { APMAPI } from '../../../server/routes/create_apm_api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Client } from '../../../server/routes/typings';

export type APMClient = Client<APMAPI['_S']>;
export type APMClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname'
> & {
  endpoint: string;
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
    const { endpoint, params = {}, ...opts } = options;

    const path = (params.path || {}) as Record<string, any>;
    const [method, pathname] = endpoint.split(' ');

    const formattedPathname = Object.keys(path).reduce((acc, paramName) => {
      return acc.replace(`{${paramName}}`, path[paramName]);
    }, pathname);

    return callApi(http, {
      ...opts,
      method,
      pathname: formattedPathname,
      body: params.body,
      query: params.query,
    });
  }) as APMClient;
}

// infer return type from API
export type APIReturnType<
  TPath extends keyof APMAPI['_S']
> = APMAPI['_S'][TPath] extends { ret: any }
  ? APMAPI['_S'][TPath]['ret']
  : unknown;
