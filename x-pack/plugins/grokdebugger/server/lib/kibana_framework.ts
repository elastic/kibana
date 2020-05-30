/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/array-type */

import { i18n } from '@kbn/i18n';

import {
  CoreSetup,
  IRouter,
  RequestHandlerContext,
  RouteMethod,
  RouteConfig,
  RequestHandler,
} from 'src/core/server';

import { ILicense } from '../../../licensing/server';

type GrokDebuggerRouteConfig<params, query, body, method extends RouteMethod> = {
  method: RouteMethod;
} & RouteConfig<params, query, body, method>;

export class KibanaFramework {
  public router: IRouter;
  public license?: ILicense;

  constructor(core: CoreSetup) {
    this.router = core.http.createRouter();
  }

  public setLicense(license: ILicense) {
    this.license = license;
  }

  private hasActiveLicense() {
    if (!this.license) {
      throw new Error(
        "Please set license information in the plugin's setup method before trying to check the status"
      );
    }
    return this.license.isActive;
  }

  public registerRoute<params = any, query = any, body = any, method extends RouteMethod = any>(
    config: GrokDebuggerRouteConfig<params, query, body, method>,
    handler: RequestHandler<params, query, body>
  ) {
    // Automatically wrap all route registrations with license checking
    const wrappedHandler: RequestHandler<params, query, body> = async (
      requestContext,
      request,
      response
    ) => {
      if (this.hasActiveLicense()) {
        return await handler(requestContext, request, response);
      } else {
        return response.forbidden({
          body: i18n.translate('xpack.grokDebugger.serverInactiveLicenseError', {
            defaultMessage: 'The Grok Debugger tool requires an active license.',
          }),
        });
      }
    };

    const routeConfig = {
      path: config.path,
      validate: config.validate,
    };

    switch (config.method) {
      case 'get':
        this.router.get(routeConfig, wrappedHandler);
        break;
      case 'post':
        this.router.post(routeConfig, wrappedHandler);
        break;
      case 'delete':
        this.router.delete(routeConfig, wrappedHandler);
        break;
      case 'put':
        this.router.put(routeConfig, wrappedHandler);
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

  public async callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: string,
    options?: any
  ) {
    const { elasticsearch } = requestContext.core;
    return elasticsearch.legacy.client.callAsCurrentUser(endpoint, options);
  }
}
