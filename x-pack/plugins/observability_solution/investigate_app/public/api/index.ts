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
import { formatRequest } from '@kbn/server-route-repository/src/format_request';
import type { InvestigateAppServerRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type InvestigateAppAPIClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type InvestigateAppAPIClient = RouteRepositoryClient<
  InvestigateAppServerRouteRepository,
  InvestigateAppAPIClientOptions
>;

export type AutoAbortedInvestigateAppAPIClient = RouteRepositoryClient<
  InvestigateAppServerRouteRepository,
  Omit<InvestigateAppAPIClientOptions, 'signal'>
>;

export type InvestigateAppAPIEndpoint = keyof InvestigateAppServerRouteRepository;

export type APIReturnType<TEndpoint extends InvestigateAppAPIEndpoint> = ReturnOf<
  InvestigateAppServerRouteRepository,
  TEndpoint
>;

export type InvestigateAppAPIClientRequestParamsOf<TEndpoint extends InvestigateAppAPIEndpoint> =
  ClientRequestParamsOf<InvestigateAppServerRouteRepository, TEndpoint>;

export function createCallInvestigateAppAPI(core: CoreStart | CoreSetup) {
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
  }) as InvestigateAppAPIClient;
}
