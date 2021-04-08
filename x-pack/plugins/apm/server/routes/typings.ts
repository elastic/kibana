/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  RequestHandlerContext,
  Logger,
  KibanaRequest,
  CoreStart,
} from 'src/core/server';
import { LicensingApiRequestHandlerContext } from '../../../licensing/server';
import { APMConfig } from '..';
import { APMPluginDependencies } from '../types';

export interface ApmPluginRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
}

export type InspectResponse = Array<{
  response: any;
  duration: number;
  requestType: string;
  requestParams: Record<string, unknown>;
  esError: Error;
}>;

export interface APMRouteCreateOptions {
  options: {
    tags: Array<
      | 'access:apm'
      | 'access:apm_write'
      | 'access:ml:canGetJobs'
      | 'access:ml:canCreateJob'
    >;
  };
}

export interface APMRouteHandlerResources {
  request: KibanaRequest;
  context: ApmPluginRequestHandlerContext;
  params: {
    query: {
      _inspect: boolean;
    };
  };
  config: APMConfig;
  logger: Logger;
  core: {
    setup: CoreSetup;
    start: () => Promise<CoreStart>;
  };
  plugins: {
    [key in keyof APMPluginDependencies]: {
      setup: Required<APMPluginDependencies>[key]['setup'];
      start: () => Promise<Required<APMPluginDependencies>[key]['start']>;
    };
  };
}

// export type Client<
//   TRouteState,
//   TOptions extends { abortable: boolean } = { abortable: true }
// > = <TEndpoint extends keyof TRouteState & string>(
//   options: Omit<
//     FetchOptions,
//     'query' | 'body' | 'pathname' | 'method' | 'signal'
//   > & {
//     forceCache?: boolean;
//     endpoint: TEndpoint;
//   } & MaybeParams<TRouteState, TEndpoint> &
//     (TOptions extends { abortable: true } ? { signal: AbortSignal | null } : {})
// ) => Promise<
//   TRouteState[TEndpoint] extends { ret: any }
//     ? TRouteState[TEndpoint]['ret']
//     : unknown
// >;
