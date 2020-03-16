/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/array-type */

import {
  CoreSetup,
  IRouter,
  KibanaRequest,
  RequestHandlerContext,
  KibanaResponseFactory,
  RouteMethod,
  RouteConfig,
  APICaller,
  RequestHandler,
} from 'src/core/server';

type GrokDebuggerRouteConfig<params, query, body, method extends RouteMethod> = {
  method: RouteMethod;
} & RouteConfig<params, query, body, method>;

// TODO: type properly
type GrokDebuggerPluginDeps = any;

export class KibanaFramework {
  public router: IRouter;
  public plugins: GrokDebuggerPluginDeps;

  constructor(core: CoreSetup, plugins: GrokDebuggerPluginDeps) {
    this.router = core.http.createRouter();
    this.plugins = plugins;
  }

  public registerRoute<params = any, query = any, body = any, method extends RouteMethod = any>(
    config: GrokDebuggerRouteConfig<params, query, body, method>,
    handler: RequestHandler<params, query, body>
  ) {
    const routeConfig = {
      path: config.path,
      validate: config.validate,
    };
    switch (config.method) {
      case 'get':
        this.router.get(routeConfig, handler);
        break;
      case 'post':
        this.router.post(routeConfig, handler);
        break;
      case 'delete':
        this.router.delete(routeConfig, handler);
        break;
      case 'put':
        this.router.put(routeConfig, handler);
        break;
    }
  }

  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'ingest.simulate',
    options?: {
      body: any;
    }
  ): Promise<any>;

  public async callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: string,
    options?: any
  ) {
    const { elasticsearch } = requestContext.core;
    return elasticsearch.dataClient.callAsCurrentUser(endpoint, options);
  }
}
