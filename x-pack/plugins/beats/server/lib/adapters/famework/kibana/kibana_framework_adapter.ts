/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
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

    this.validateConfig();
  }

  public getSetting(settingPath: string) {
    // TODO type check server properly
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

  private validateConfig() {
    // @ts-ignore
    const config = this.server.config();
    const encryptionKey = config.get('xpack.beats.encryptionKey');
    if (encryptionKey === null || encryptionKey === undefined) {
      this.server.log(`
Generating a random key for xpack.beats.encryptionKey. To prevent beats from loosing connection with centeral management on Kibana restart, please set xpack.beats.encryptionKey in kibana.yml
`);
      config.set(
        'xpack.reporting.encryptionKey',
        crypto.randomBytes(16).toString('hex')
      );
    }
  }
}
