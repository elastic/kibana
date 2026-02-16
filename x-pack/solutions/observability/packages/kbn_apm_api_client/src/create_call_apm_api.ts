/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository-utils';
import type { APMRouteRepository, APIEndpoint } from '@kbn/apm-routes-contract';
import type { Request } from '@kbn/inspector-plugin/common';
import type { FetchOptions } from './call_api';
import type { CallApi } from './call_api';
import { callApi } from './call_api';

export type InspectResponse = Request[];

export type APMClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
  signal: AbortSignal | null;
};

export type APMClient = RouteRepositoryClient<APMRouteRepository, APMClientOptions>['fetch'];

export type AutoAbortedAPMClient = RouteRepositoryClient<
  APMRouteRepository,
  Omit<APMClientOptions, 'signal'>
>['fetch'];

export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  APMRouteRepository,
  TEndpoint
> & {
  _inspect?: InspectResponse;
};

export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<
  APMRouteRepository,
  TEndpoint
>;

export type AbstractAPMRepository = ServerRouteRepository;

export type AbstractAPMClient = RouteRepositoryClient<
  AbstractAPMRepository,
  APMClientOptions
>['fetch'];

export function createCallApmApi(core: CoreStart | CoreSetup): APMClient {
  return ((endpoint, options) => {
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
