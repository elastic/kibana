/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository-utils';
import { InspectResponse } from '@kbn/observability-plugin/typings/common';
import { FetchOptions } from '../../../common/fetch_options';
import { CallApi, callApi } from './call_api';
import type { APMServerRouteRepository, APIEndpoint } from '../../../server';

export type APMClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
  signal: AbortSignal | null;
};

export type APMClient = RouteRepositoryClient<APMServerRouteRepository, APMClientOptions>['fetch'];

export type AutoAbortedAPMClient = RouteRepositoryClient<
  APMServerRouteRepository,
  Omit<APMClientOptions, 'signal'>
>['fetch'];

export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  APMServerRouteRepository,
  TEndpoint
> & {
  _inspect?: InspectResponse;
};

export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<
  APMServerRouteRepository,
  TEndpoint
>;

export type AbstractAPMRepository = ServerRouteRepository;

export type AbstractAPMClient = RouteRepositoryClient<
  AbstractAPMRepository,
  APMClientOptions
>['fetch'];

export let callApmApi: APMClient = () => {
  throw new Error('callApmApi has to be initialized before used. Call createCallApmApi first.');
};

export function createCallApmApi(core: CoreStart | CoreSetup) {
  callApmApi = ((endpoint, options) => {
    const { params } = options as unknown as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname, version } = formatRequest(endpoint, params?.path);

    return callApi(core, {
      ...options,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
      version,
    } as unknown as Parameters<CallApi>[1]);
  }) as APMClient;
}
