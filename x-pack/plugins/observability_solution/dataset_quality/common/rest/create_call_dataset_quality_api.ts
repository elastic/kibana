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
} from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository';
import { FetchOptions } from '..';
import type { APIEndpoint, DatasetQualityServerRouteRepository } from '../../server/routes';
import { CallApi, callApi } from './call_api';

export type DatasetQualityClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type DatasetQualityClient = RouteRepositoryClient<
  DatasetQualityServerRouteRepository,
  DatasetQualityClientOptions
>;

export type AutoAbortedClient = RouteRepositoryClient<
  DatasetQualityServerRouteRepository,
  Omit<DatasetQualityClientOptions, 'signal'>
>;

export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  DatasetQualityServerRouteRepository,
  TEndpoint
>;

export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<
  DatasetQualityServerRouteRepository,
  TEndpoint
>;

export let callDatasetQualityApi: DatasetQualityClient = () => {
  throw new Error(
    'callDatasetQualityApi has to be initialized before used. Call createCallApi first.'
  );
};

export function createCallDatasetQualityApi(core: CoreStart | CoreSetup) {
  callDatasetQualityApi = ((endpoint, options) => {
    const { params } = options as unknown as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname } = formatRequest(endpoint, params?.path);

    return callApi(core, {
      ...options,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
    } as unknown as Parameters<CallApi>[1]);
  }) as DatasetQualityClient;
}
