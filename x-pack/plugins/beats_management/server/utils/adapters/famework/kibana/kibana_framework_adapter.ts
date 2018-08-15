/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BackendFrameworkAdapter,
  FrameworkRequest,
  FrameworkRouteOptions,
  WrappableRequest,
} from '../../../lib';

import { IStrictReply, Request, Server } from 'hapi';
import {
  internalFrameworkRequest,
  wrapRequest,
} from '../../../../utils/wrap_request';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public version: string;

  private server: Server;

  constructor(hapiServer: Server) {
    this.server = hapiServer;
    this.version = hapiServer.plugins.kibana.status.plugin.version;
  }

  public getSetting(settingPath: string) {
    // TODO type check this properly
    // @ts-ignore
    return this.server.config().get(settingPath);
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    this.server.route({
      handler: {
        directory: {
          path: dir,
        },
      },
      method: 'GET',
      path: urlPath,
    });
  }

  public registerRoute<RouteRequest extends WrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ) {
    const wrappedHandler = (request: any, reply: IStrictReply<RouteResponse>) =>
      route.handler(wrapRequest(request), reply);

    this.server.route({
      config: route.config,
      handler: wrappedHandler,
      method: route.method,
      path: route.path,
    });
  }

  public installIndexTemplate(name: string, template: {}) {
    return this.callWithInternalUser('indices.putTemplate', {
      body: template,
      name,
    });
  }

  public async callWithInternalUser(esMethod: string, options: {}) {
    const { elasticsearch } = this.server.plugins;
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    return await callWithInternalUser(esMethod, options);
  }

  public async callWithRequest(req: FrameworkRequest<Request>, ...rest: any[]) {
    const internalRequest = req[internalFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const fields = await callWithRequest(internalRequest, ...rest);
    return fields;
  }
}
