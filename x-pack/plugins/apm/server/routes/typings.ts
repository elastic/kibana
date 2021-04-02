/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import t, { Encode, Encoder } from 'io-ts';
import {
  CoreSetup,
  KibanaRequest,
  RequestHandlerContext,
  Logger,
} from 'src/core/server';
import { Observable } from 'rxjs';
import { RequiredKeys, DeepPartial } from 'utility-types';
import { SpacesPluginStart } from '../../../spaces/server';
import { ObservabilityPluginSetup } from '../../../observability/server';
import { LicensingApiRequestHandlerContext } from '../../../licensing/server';
import { SecurityPluginSetup } from '../../../security/server';
import { MlPluginSetup } from '../../../ml/server';
import { FetchOptions } from '../../common/fetch_options';
import { APMConfig } from '..';

export type HandlerReturn = Record<string, any>;

interface InspectQueryParam {
  query: { _inspect: boolean };
}

export type InspectResponse = Array<{
  response: any;
  duration: number;
  requestType: string;
  requestParams: Record<string, unknown>;
  esError: Error;
}>;

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
  TReturn extends HandlerReturn
> = (kibanaContext: {
  context: APMRequestHandlerContext<
    (TParamsRT extends RouteParamsRT ? t.TypeOf<TParamsRT> : {}) &
      InspectQueryParam
  >;
  request: KibanaRequest;
}) => Promise<TReturn extends any[] ? never : TReturn>;

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
  TReturn extends HandlerReturn
> {
  endpoint: TEndpoint;
  options: RouteOptions;
  params?: TRouteParamsRT;
  handler: RouteHandler<TRouteParamsRT, TReturn>;
}

/**
 * @internal
 */
export interface ApmPluginRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
}

export type APMRequestHandlerContext<
  TRouteParams = {}
> = ApmPluginRequestHandlerContext & {
  params: TRouteParams & InspectQueryParam;
  config: APMConfig;
  logger: Logger;
  plugins: {
    spaces?: SpacesPluginStart;
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
    TReturn extends HandlerReturn,
    TRouteParamsRT extends RouteParamsRT | undefined = undefined
  >(
    route:
      | Route<TEndpoint, TRouteParamsRT, TReturn>
      | ((core: CoreSetup) => Route<TEndpoint, TRouteParamsRT, TReturn>)
  ): ServerAPI<
    TRouteState &
      {
        [key in TEndpoint]: {
          params: TRouteParamsRT;
          ret: TReturn & { _inspect?: InspectResponse };
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

export type MaybeParams<
  TRouteState,
  TEndpoint extends keyof TRouteState & string
> = TRouteState[TEndpoint] extends { params: t.Any }
  ? MaybeOptional<{
      params: t.OutputOf<TRouteState[TEndpoint]['params']> &
        DeepPartial<InspectQueryParam>;
    }>
  : {};

export type Client<
  TRouteState,
  TOptions extends { abortable: boolean } = { abortable: true }
> = <TEndpoint extends keyof TRouteState & string>(
  options: Omit<
    FetchOptions,
    'query' | 'body' | 'pathname' | 'method' | 'signal'
  > & {
    forceCache?: boolean;
    endpoint: TEndpoint;
  } & MaybeParams<TRouteState, TEndpoint> &
    (TOptions extends { abortable: true } ? { signal: AbortSignal | null } : {})
) => Promise<
  TRouteState[TEndpoint] extends { ret: any }
    ? TRouteState[TEndpoint]['ret']
    : unknown
>;
