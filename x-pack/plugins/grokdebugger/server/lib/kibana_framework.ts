/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CoreSetup, IRouter, RouteMethod, RouteConfig, RequestHandler } from '@kbn/core/server';

import { ILicense } from '@kbn/licensing-plugin/server';

type GrokDebuggerRouteConfig<Params, Query, Body, Method extends RouteMethod> = {
  method: RouteMethod;
} & RouteConfig<Params, Query, Body, Method>;

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

  public registerRoute<Params = any, Query = any, Body = any, Method extends RouteMethod = any>(
    config: GrokDebuggerRouteConfig<Params, Query, Body, Method>,
    handler: RequestHandler<Params, Query, Body>
  ) {
    // Automatically wrap all route registrations with license checking
    const wrappedHandler: RequestHandler<Params, Query, Body> = async (
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
}
