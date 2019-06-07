/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent as HTTPSAgent } from 'https';
import { Agent as HTTPAgent } from 'http';
import { URL } from 'url';

import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import Wreck from 'wreck';
import { schema, TypeOf } from '@kbn/config-schema';

import { Plugin, PluginInitializerContext, Logger, CoreStart, CoreSetup } from 'src/core/server';

import { HttpServerSetup } from 'src/core/server/http/http_server';

import { RouteState, RoutingNode, ClusterDocClient } from './cluster_doc';

export interface ProxyServiceSetup {
  httpSetup: HttpServerSetup;
}

type ProxyRequest = (req: Request, h: ResponseToolkit) => Promise<ResponseObject>;

export interface ProxyServiceStart {
  assignResource: (resource: string, data: RoutingNode) => Promise<void>;
  unassignResource: (resource: string) => Promise<void>;
  proxyResource: (resource: string) => ProxyRequest;
  proxyRequest: ProxyRequest;
  getAllocation: () => Observable<[string, RoutingNode]>;
}

export const ProxyConfig = {
  schema: schema.object({
    updateInterval: schema.number(),
    timeoutThreshold: schema.number(),
    port: schema.number(),
  }),
};
export type ProxyPluginType = TypeOf<typeof ProxyConfig.schema>;

export class ProxyService implements Plugin<ProxyServiceSetup, ProxyServiceStart> {
  private port: number = 5602;
  private configSubscription?: Subscription;
  private clusterDocClient: ClusterDocClient;

  private readonly httpsAgent: HTTPSAgent;
  private readonly httpAgent: HTTPAgent;
  private readonly allowUnauthAgent: HTTPAgent;
  private readonly wreck: typeof Wreck;
  private readonly log: Logger;
  private readonly config$: Observable<ProxyPluginType>;

  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<ProxyPluginType>();
    this.log = initializerContext.logger.get('proxy');
    this.clusterDocClient = new ClusterDocClient(initializerContext);
    this.httpsAgent = new HTTPSAgent({ keepAlive: true });
    this.httpAgent = new HTTPAgent({ keepAlive: true });
    this.allowUnauthAgent = new HTTPAgent({ keepAlive: true });
    this.wreck = Wreck.defaults({
      agent: {
        https: this.httpsAgent,
        http: this.httpAgent,
        httpsAllowUnauthorized: this.allowUnauthAgent,
      },
    });
  }

  public async setup(core: CoreSetup, plugins: {}) {
    await this.clusterDocClient.setup(core);

    this.configSubscription = this.config$.subscribe(config => {
      this.setConfig(config);
    });
    const config = await this.config$.pipe(first()).toPromise();
    this.setConfig(config);

    const httpSetup = await core.http.createNewServer({ port: config.port });
    const setup: ProxyServiceSetup = {
      httpSetup,
    };
    return setup;
  }

  private setConfig(config: ProxyPluginType) {
    this.port = config.port || this.port;
  }

  public async start(core: CoreStart) {
    await this.clusterDocClient.start();
    const start: ProxyServiceStart = {
      assignResource: this.assignResource.bind(this),
      unassignResource: this.unassignResource.bind(this),
      proxyResource: this.proxyResource.bind(this),
      proxyRequest: this.proxyRequest.bind(this),
      getAllocation: this.getAllocation.bind(this),
    };
    return start;
  }

  public async stop() {
    await this.clusterDocClient.stop();
    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription.unsubscribe();
    this.configSubscription = undefined;
  }

  public async assignResource(resource: string, data: RoutingNode): Promise<void> {
    await this.clusterDocClient.assignResource(resource, data);
  }

  public async unassignResource(resource: string) {
    await this.clusterDocClient.unassignResource(resource);
  }

  public proxyResource(resource: string): ProxyRequest {
    return (req: Request, h: ResponseToolkit) => {
      return this.proxyRequest(req, h, resource);
    };
  }

  // @TODO update to use KibanaRequest object: https://github.com/restrry/kibana/blob/f1a1a3dfbe2d19e241a20b6f71ef98f0fb999e7c/src/core/server/http/router/request.ts#L28
  // @TODO update to allow passing of request parametsrs
  // @TODO update to allow passing of http method
  public async proxyRequest(req: Request, h: ResponseToolkit, resource?: string) {
    const url = new URL(req.url.toString());
    resource = resource || url.pathname;
    const node = this.clusterDocClient.getNodeForResource(resource);

    if (!node) {
      this.log.debug(`No node was found for resource ${resource}`);
      const res = h.response('Not found');
      res.code(404);
      return res;
    }

    if (node.state !== RouteState.Started) {
      this.log.warn(
        `Unable to foward request for ${resource} to ${node.node} because node was ${node.state}`
      );
      const res = h.response('Service Unavailable');
      res.code(503);
      return res;
    }

    url.hostname = node.node;
    try {
      const { payload } = await this.wreck.get(url.toString(), { json: true });
      const res = h.response(payload);
      res.code(200);
      res.header('content-type', 'application/json');
      return res;
    } catch (err) {
      this.log.warn(
        `Unable to complete request to ${node.node} for ${resource} because ${err.message}`
      );
      const res = h.response('Internal server error');
      res.code(500);
      return res;
    }
  }

  public getAllocation(): Observable<[string, RoutingNode]> {
    return this.clusterDocClient.getRoutingTable();
  }
}
