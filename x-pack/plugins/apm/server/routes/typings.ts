/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import t, { Encode, Encoder } from 'io-ts';
import {
  CoreSetup,
  KibanaRequest,
  RequestHandlerContext,
  Logger,
} from 'src/core/server';
import { Observable } from 'rxjs';
import { RequiredKeys } from 'utility-types';
import { ObservabilityPluginSetup } from '../../../observability/server';
import { SecurityPluginSetup } from '../../../security/server';
import { MlPluginSetup } from '../../../ml/server';
import { FetchOptions } from '../../common/fetch_options';
import { APMConfig } from '..';

export interface RouteParams {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: any;
}

type WithoutIncompatibleMethods<T extends t.Any> = Omit<
  T,
  'encode' | 'asEncoder'
> & { encode: Encode<any, any>; asEncoder: () => Encoder<any, any> };

export type RouteParamsRT = WithoutIncompatibleMethods<t.Type<RouteParams>>;

export type RouteHandler<
  TParamsRT extends RouteParamsRT | undefined,
  TReturn
> = (kibanaContext: {
  context: APMRequestHandlerContext<
    (TParamsRT extends RouteParamsRT ? t.TypeOf<TParamsRT> : {}) & {
      query: { _debug: boolean };
    }
  >;
  request: KibanaRequest;
}) => Promise<TReturn>;

interface RouteOptions {
  tags: Array<
    | 'access:apm'
    | 'access:apm_write'
    | 'access:ml:canGetJobs'
    | 'access:ml:canCreateJob'
  >;
}

export interface Route<
  TEndpoint extends string,
  TRouteParamsRT extends RouteParamsRT | undefined,
  TReturn
> {
  endpoint: TEndpoint;
  options: RouteOptions;
  params?: TRouteParamsRT;
  handler: RouteHandler<TRouteParamsRT, TReturn>;
}

export type APMRequestHandlerContext<
  TRouteParams = {}
> = RequestHandlerContext & {
  params: TRouteParams & { query: { _debug: boolean } };
  config: APMConfig;
  logger: Logger;
  plugins: {
    observability?: ObservabilityPluginSetup;
    security?: SecurityPluginSetup;
    ml?: MlPluginSetup;
  };
};

export interface RouteState {
  [endpoint: string]: {
    params?: RouteParams;
    ret: any;
  };
}

export interface ServerAPI<TRouteState extends RouteState> {
  _S: TRouteState;
  add<
    TEndpoint extends string,
    TRouteParamsRT extends RouteParamsRT | undefined = undefined,
    TReturn = unknown
  >(
    route:
      | Route<TEndpoint, TRouteParamsRT, TReturn>
      | ((core: CoreSetup) => Route<TEndpoint, TRouteParamsRT, TReturn>)
  ): ServerAPI<
    TRouteState &
      {
        [key in TEndpoint]: {
          params: TRouteParamsRT;
          ret: TReturn;
        };
      }
  >;
  init: (
    core: CoreSetup,
    context: {
      config$: Observable<APMConfig>;
      logger: Logger;
      plugins: {
        observability?: ObservabilityPluginSetup;
        security?: SecurityPluginSetup;
        ml?: MlPluginSetup;
      };
    }
  ) => void;
}

type MaybeOptional<T extends { params: Record<string, any> }> = RequiredKeys<
  T['params']
> extends never
  ? { params?: T['params'] }
  : { params: T['params'] };

export type Client<TRouteState> = <
  TEndpoint extends keyof TRouteState & string
>(
  options: Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'method'> & {
    forceCache?: boolean;
    endpoint: TEndpoint;
  } & (TRouteState[TEndpoint] extends { params: t.Any }
      ? MaybeOptional<{ params: t.TypeOf<TRouteState[TEndpoint]['params']> }>
      : {})
) => Promise<
  TRouteState[TEndpoint] extends { ret: any }
    ? TRouteState[TEndpoint]['ret']
    : unknown
>;
