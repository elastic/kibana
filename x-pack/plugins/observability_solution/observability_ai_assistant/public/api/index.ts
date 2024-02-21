/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository';
import type { ObservabilityAIAssistantServerRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type ObservabilityAIAssistantAPIClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type ObservabilityAIAssistantAPIClient = RouteRepositoryClient<
  ObservabilityAIAssistantServerRouteRepository,
  ObservabilityAIAssistantAPIClientOptions
>;

export type AutoAbortedObservabilityAIAssistantAPIClient = RouteRepositoryClient<
  ObservabilityAIAssistantServerRouteRepository,
  Omit<ObservabilityAIAssistantAPIClientOptions, 'signal'>
>;

export type ObservabilityAIAssistantAPIEndpoint =
  keyof ObservabilityAIAssistantServerRouteRepository;

export type APIReturnType<TEndpoint extends ObservabilityAIAssistantAPIEndpoint> = ReturnOf<
  ObservabilityAIAssistantServerRouteRepository,
  TEndpoint
>;

export type ObservabilityAIAssistantAPIClientRequestParamsOf<
  TEndpoint extends ObservabilityAIAssistantAPIEndpoint
> = ClientRequestParamsOf<ObservabilityAIAssistantServerRouteRepository, TEndpoint>;

export function createCallObservabilityAIAssistantAPI(core: CoreStart | CoreSetup) {
  return ((endpoint, options) => {
    const { params } = options as unknown as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname, version } = formatRequest(endpoint, params?.path);

    return core.http[method](pathname, {
      ...options,
      body: params && params.body ? JSON.stringify(params.body) : undefined,
      query: params?.query,
      version,
    });
  }) as ObservabilityAIAssistantAPIClient;
}
