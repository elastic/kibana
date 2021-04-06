/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from 'kibana/public';
import type {
  ClientRequestParamsOf,
  EndpointOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository/target/format_request';
import { FetchOptions } from '../../../common/fetch_options';
import { callApi } from './callApi';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { APMServerRouteRepository } from '../../../server';

export type APMClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type APMClient = RouteRepositoryClient<
  APMServerRouteRepository,
  APMClientOptions
>;

export type AutoAbortedAPMClient = RouteRepositoryClient<
  APMServerRouteRepository,
  Omit<APMClientOptions, 'signal'>
>;

export type APIReturnType<
  TEndpoint extends EndpointOf<APMServerRouteRepository>
> = ReturnOf<APMServerRouteRepository, TEndpoint>;

export type APIEndpoint = EndpointOf<APMServerRouteRepository>;

export type APIClientRequestParamsOf<
  TEndpoint extends EndpointOf<APMServerRouteRepository>
> = ClientRequestParamsOf<APMServerRouteRepository, TEndpoint>;

export let callApmApi: APMClient = () => {
  throw new Error(
    'callApmApi has to be initialized before used. Call createCallApmApi first.'
  );
};

export function createCallApmApi(core: CoreStart | CoreSetup) {
  callApmApi = ((options) => {
    const { endpoint, ...opts } = options;
    const { params } = (options as unknown) as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname } = formatRequest(endpoint, params?.path);

    return callApi(core, {
      ...opts,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
    });
  }) as APMClient;
}
