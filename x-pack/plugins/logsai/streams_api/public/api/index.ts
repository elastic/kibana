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
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { StreamsAPIServerRouteRepository as StreamsAPIServerRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type StreamsAPIClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type StreamsAPIClient = RouteRepositoryClient<
  StreamsAPIServerRouteRepository,
  StreamsAPIClientOptions
>;

export type AutoAbortedStreamsAPIClient = RouteRepositoryClient<
  StreamsAPIServerRouteRepository,
  Omit<StreamsAPIClientOptions, 'signal'>
>;

export type StreamsAPIEndpoint = keyof StreamsAPIServerRouteRepository;

export type APIReturnType<TEndpoint extends StreamsAPIEndpoint> = ReturnOf<
  StreamsAPIServerRouteRepository,
  TEndpoint
>;

export type StreamsAPIClientRequestParamsOf<TEndpoint extends StreamsAPIEndpoint> =
  ClientRequestParamsOf<StreamsAPIServerRouteRepository, TEndpoint>;

export function createStreamsAPIClient(core: CoreStart | CoreSetup): StreamsAPIClient {
  return createRepositoryClient(core);
}
