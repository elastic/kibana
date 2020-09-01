/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import t from 'io-ts';
import {
  CoreSetup,
  KibanaRequest,
  RequestHandlerContext,
  Logger,
} from 'src/core/server';
import { PickByValue, Optional } from 'utility-types';
import { Observable } from 'rxjs';
import { Server } from 'hapi';
import { ObservabilityPluginSetup } from '../../../observability/server';
import { SecurityPluginSetup } from '../../../security/server';
import { MlPluginSetup } from '../../../ml/server';
import { FetchOptions } from '../../common/fetch_options';
import { APMConfig } from '..';

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
  body?: t.Any | t.HasProps;
}

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any
    ? t.TypeOf<TParams[key]>
    : never;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Route<
  TPath extends string,
  TMethod extends HttpMethod | undefined,
  TParams extends Params | undefined,
  TReturn
> {
  path: TPath;
  method?: TMethod;
  params?: TParams;
  options?: {
    tags: Array<
      | 'access:apm'
      | 'access:apm_write'
      | 'access:ml:canGetJobs'
      | 'access:ml:canCreateJob'
    >;
  };
  handler: (kibanaContext: {
    context: APMRequestHandlerContext<DecodeParams<TParams>>;
    request: KibanaRequest;
  }) => Promise<TReturn>;
}

export type APMLegacyServer = Pick<Server, 'savedObjects' | 'log'> & {
  plugins: {
    elasticsearch: Server['plugins']['elasticsearch'];
  };
};

export type APMRequestHandlerContext<
  TDecodedParams extends { [key in keyof Params]: any } = {}
> = RequestHandlerContext & {
  params: { query: { _debug: boolean } } & TDecodedParams;
  config: APMConfig;
  logger: Logger;
  plugins: {
    observability?: ObservabilityPluginSetup;
    security?: SecurityPluginSetup;
    ml?: MlPluginSetup;
  };
};

export type RouteFactoryFn<
  TPath extends string,
  TMethod extends HttpMethod | undefined,
  TParams extends Params,
  TReturn
> = (core: CoreSetup) => Route<TPath, TMethod, TParams, TReturn>;

export interface RouteState {
  [key: string]: {
    [key in HttpMethod]: {
      params?: Params;
      ret: any;
    };
  };
}

export interface ServerAPI<TRouteState extends RouteState> {
  _S: TRouteState;
  add<
    TPath extends string,
    TReturn,
    // default params allow them to be optional in the route configuration object
    TMethod extends HttpMethod = 'GET',
    TParams extends Params = {}
  >(
    factoryFn: RouteFactoryFn<TPath, TMethod, TParams, TReturn>
  ): ServerAPI<
    TRouteState &
      {
        [Key in TPath]: {
          [key in TMethod]: {
            ret: TReturn;
          } & (TParams extends Params ? { params: TParams } : {});
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

// without this, TS does not recognize possible existence of `params` in `options` below
interface NoParams<TParams extends Params> {
  params?: TParams;
}

type GetOptionalParamKeys<TParams extends Params> = keyof PickByValue<
  {
    [key in keyof TParams]: TParams[key] extends t.PartialType<any>
      ? false
      : TParams[key] extends t.Any
      ? true
      : false;
  },
  false
>;

// this type makes the params object optional if no required props are found
type GetParams<TParams extends Params> = Exclude<
  keyof TParams,
  GetOptionalParamKeys<TParams>
> extends never
  ? NoParams<Optional<DecodeParams<TParams>>>
  : {
      params: Optional<DecodeParams<TParams>, GetOptionalParamKeys<TParams>>;
    };

export type Client<TRouteState> = <
  TPath extends keyof TRouteState & string,
  TMethod extends keyof TRouteState[TPath] & string,
  TRouteDescription extends TRouteState[TPath][TMethod],
  TParams extends TRouteDescription extends { params: Params }
    ? TRouteDescription['params']
    : undefined,
  TReturn extends TRouteDescription extends { ret: any }
    ? TRouteDescription['ret']
    : undefined
>(
  options: Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'method'> & {
    forceCache?: boolean;
    pathname: TPath;
  } & (TMethod extends 'GET' ? { method?: TMethod } : { method: TMethod }) &
    // Makes sure params can only be set when types were defined
    (TParams extends Params
      ? GetParams<TParams>
      : NoParams<Record<string, any>>)
) => Promise<TReturn>;
