/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent as HTTPSAgent } from 'https';
import { Agent as HTTPAgent } from 'http';
import { URL } from 'url';

import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import Wreck from 'wreck';
import { schema, TypeOf } from '@kbn/config-schema';

import {
  Plugin,
  PluginInitializerContext,
  Logger,
  CoreStart,
  CoreSetup,
  KibanaRequest,
} from 'src/core/server';

import { HttpServerSetup } from 'src/core/server/http/http_server';

import { RouteState, RoutingNode, ClusterDocClient } from './cluster_doc';

export interface ProxyServiceSetup {
  httpSetup: HttpServerSetup;
}

type ProxyRequest = (req: KibanaRequest) => Promise<any>;

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
    maxRetry: schema.number(),
    requestBackoff: schema.number(),
  }),
};
export type ProxyPluginType = TypeOf<typeof ProxyConfig.schema>;

export class ProxyService implements Plugin<ProxyServiceSetup, ProxyServiceStart> {
  private configSubscription?: Subscription;
  private clusterDocClient: ClusterDocClient;
  private maxRetry = 0;
  private requestBackoff = 0;

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
    await this.clusterDocClient.setup(core.elasticsearch);

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
    this.maxRetry = config.maxRetry;
    this.requestBackoff = config.requestBackoff;
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
    return (req: KibanaRequest) => {
      return this.proxyRequest(req, resource);
    };
  }

  // @TODO update to allow passing of request parametsrs
  public async proxyRequest(req: KibanaRequest, resource?: string, retryCount = 0): Promise<any> {
    const method = req.route.method;
    const url = new URL(req.url.toString());
    const headers = req.headers;
    const body = req.body;
    resource = resource || url.pathname;
    const node = this.clusterDocClient.getNodeForResource(resource);

    if (!node) {
      const msg = `No node was found for resource ${resource}`;
      this.log.debug(msg);
      throw new Error(msg);
    }

    if (node.state === RouteState.Initializing) {
      this.log.warn(
        `${node.node} is still starting retry ${retryCount}/${this.maxRetry} in ${
          this.requestBackoff
        }`
      );
      if (retryCount <= this.maxRetry) {
        return await new Promise(resolve => {
          setTimeout(async () => {
            await this.proxyRequest(req, resource, ++retryCount);
            resolve();
          }, this.requestBackoff);
        });
      } else {
        throw new Error(`maxRetries exceeded and node has not yet initialized`);
      }
    }

    url.hostname = node.node;
    try {
      const opts = {
        headers,
        payload: body,
      };
      const res = await this.wreck.request(method, url.toString(), opts);
      const data = Wreck.read(res, {});
      return data;
    } catch (err) {
      const msg = `Unable to complete request to ${node.node} for ${resource} because ${
        err.message
      }`;
      this.log.warn(msg);
      throw new Error(msg);
    }
  }

  public getAllocation(): Observable<[string, RoutingNode]> {
    return this.clusterDocClient.getRoutingTable();
  }
}
