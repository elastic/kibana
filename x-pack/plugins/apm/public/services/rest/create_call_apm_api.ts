/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from 'kibana/public';
import type {
  ClientRequestParamsOf,
  formatRequest as formatRequestType,
  ReturnOf,
  RouteRepositoryClient,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
// @ts-expect-error cannot find module or correspondent type declarations
// The code and types are at separated folders on @kbn/server-route-repository
// so in order to do targeted imports they must me imported separately, and
// an error is expected here
import { formatRequest } from '@kbn/server-route-repository/target_node/format_request';
import { FetchOptions } from '../../../common/fetch_options';
import { CallApi, callApi } from './call_api';
import type {
  APMServerRouteRepository,
  APIEndpoint,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../server';
import { InspectResponse } from '../../../../observability/typings/common';

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

export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  APMServerRouteRepository,
  TEndpoint
> & {
  _inspect?: InspectResponse;
};

export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> =
  ClientRequestParamsOf<APMServerRouteRepository, TEndpoint>;

export type AbstractAPMRepository = ServerRouteRepository;

export type AbstractAPMClient = RouteRepositoryClient<
  AbstractAPMRepository,
  APMClientOptions
>;

export let callApmApi: APMClient = () => {
  throw new Error(
    'callApmApi has to be initialized before used. Call createCallApmApi first.'
  );
};

export function createCallApmApi(core: CoreStart | CoreSetup) {
  callApmApi = ((endpoint, options) => {
    const { params } = options as unknown as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname } = formatRequest(
      endpoint,
      params?.path
    ) as ReturnType<typeof formatRequestType>;

    return callApi(core, {
      ...options,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
    } as unknown as Parameters<CallApi>[1]);
  }) as APMClient;
}
