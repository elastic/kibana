/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, HttpFetchOptions, HttpResponse } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository-utils';
import { httpResponseIntoObservable } from '@kbn/inference-plugin/public';
import { from } from 'rxjs';
import type { InventoryServerRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type InventoryAPIClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  asEventSourceStream?: boolean;
  signal: AbortSignal | null;
};

export type InventoryAPIClient = RouteRepositoryClient<
  InventoryServerRouteRepository,
  InventoryAPIClientOptions
>;

export type AutoAbortedInventoryAPIClient = RouteRepositoryClient<
  InventoryServerRouteRepository,
  Omit<InventoryAPIClientOptions, 'signal'>
>;

export type InventoryAPIEndpoint = keyof InventoryServerRouteRepository;

export type APIReturnType<TEndpoint extends InventoryAPIEndpoint> = ReturnOf<
  InventoryServerRouteRepository,
  TEndpoint
>;

export type InventoryAPIClientRequestParamsOf<TEndpoint extends InventoryAPIEndpoint> =
  ClientRequestParamsOf<InventoryServerRouteRepository, TEndpoint>;

export function createCallInventoryAPI(core: CoreStart | CoreSetup) {
  return ((endpoint, options) => {
    const { params, asEventSourceStream, ...passthrough } = options as unknown as {
      params?: Partial<Record<string, any>>;
      asEventSourceStream?: boolean;
    };

    const { method, pathname, version } = formatRequest(endpoint, params?.path);

    const response = core.http[method](pathname, {
      ...passthrough,
      body: params && params.body ? JSON.stringify(params.body) : undefined,
      query: params?.query,
      version,
      ...(asEventSourceStream ? { rawResponse: true, asResponse: true } : {}),
    });

    if (asEventSourceStream) {
      return from(response as Promise<HttpResponse<unknown>>).pipe(httpResponseIntoObservable());
    }
    return response;
  }) as InventoryAPIClient;
}
