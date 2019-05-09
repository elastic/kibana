/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent as HTTPSAgent } from 'https';
import { Agent as HTTPAgent } from 'http';
import { URL } from 'url';

import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { Observable, Subscription, from } from 'rxjs';
import { first } from 'rxjs/operators';
import { v4 } from 'uuid';
import Wreck from 'wreck';
import { schema, TypeOf } from '@kbn/config-schema';

import {
  Plugin,
  PluginInitializerContext,
  ClusterClient,
  Logger,
  CoreStart,
  CoreSetup,
} from 'src/core/server';

import { HttpServerSetup } from 'src/core/server/http/http_server';

export enum RouteState {
  Initializing,
  Started,
  Closed,
}

export interface RoutingNode {
  type: string; // what are all the types this can be?
  node: string;
  state: RouteState;
}

interface LivenessNode {
  lastUpdate: number;
  lastChangedTime: number;
}

interface ClusterDoc {
  nodes: {
    [key: string]: LivenessNode;
  };
  routing_table: {
    [key: string]: RoutingNode;
  };
}

export type RoutingTable = Map<string, RoutingNode>;
type NodeList = Map<string, LivenessNode>;

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

// convert a map<string, V> to a plain javascript object of {[key:string]: val}
function map2obj<V>(map: Map<string, V>): { [key: string]: V } {
  return [...map].reduce((a, [k, v]) => Object.assign(a, { [k]: v }), {});
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
  private updateInterval: number = 1000 * 15;
  private timeoutThreshold: number = 1000 * 30;
  private port: number = 5602;
  private timer: null | NodeJS.Timeout = null;
  private configSubscription?: Subscription;
  private routingTable: RoutingTable = new Map();
  private elasticsearch?: Observable<ClusterClient>;
  private nodeName: string;

  private readonly proxyIndex = '.kibana';
  private readonly proxyDoc = 'proxy-resource-list';
  private readonly httpsAgent: HTTPSAgent;
  private readonly httpAgent: HTTPAgent;
  private readonly allowUnauthAgent: HTTPAgent;
  private readonly wreck: typeof Wreck;
  private readonly log: Logger;
  private readonly config$: Observable<ProxyPluginType>;

  constructor(initializerContext: PluginInitializerContext) {
    this.nodeName = v4();
    this.config$ = initializerContext.config.create<ProxyPluginType>();
    this.log = initializerContext.logger.get('proxy');
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
    this.configSubscription = this.config$.subscribe(config => {
      this.setConfig(config);
    });

    const config = await this.config$.pipe(first()).toPromise();
    this.setConfig(config);
    this.elasticsearch = core.elasticsearch.dataClient$;
    const httpSetup = await core.http.createNewServer({ port: config.port });
    const setup: ProxyServiceSetup = {
      httpSetup,
    };
    return setup;
  }

  private setConfig(config: ProxyPluginType) {
    this.updateInterval = config.updateInterval || this.updateInterval;
    this.timeoutThreshold = config.timeoutThreshold || this.timeoutThreshold;
    this.port = config.port || this.port;
  }

  public async start(core: CoreStart) {
    this.mainLoop();
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
    // stop http service
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const nodes = await this.getNodeList();
    nodes.delete(this.nodeName);
    await this.updateNodeList(nodes);

    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription.unsubscribe();
    this.configSubscription = undefined;
  }

  public async assignResource(resource: string, data: RoutingNode): Promise<void> {
    this.routingTable.set(resource, data);
    const nodes = await this.getNodeList();
    const currentTime = new Date().getTime();
    await this.updateNodeList(this.updateLocalNode(nodes, currentTime));
  }

  public async unassignResource(resource: string) {
    this.routingTable.delete(resource);
    const nodes = await this.getNodeList();
    const currentTime = new Date().getTime();
    await this.updateNodeList(this.updateLocalNode(nodes, currentTime));
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
    const node = this.routingTable.get(resource);

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
    return from(this.routingTable);
  }

  private setTimer() {
    if (this.timer) return;
    this.log.debug('Set timer to updateNodeMap');
    this.timer = setInterval(async () => {
      this.log.debug('Updating node map');
      await this.mainLoop();
    }, this.updateInterval);
  }

  private updateRoutingTable(routingTable: { [key: string]: RoutingNode }): void {
    const currentRoutes = [...this.routingTable.keys()];
    for (const [key, node] of Object.entries(routingTable)) {
      this.routingTable.set(key, node);
      const idx = currentRoutes.findIndex(k => k === key);
      if (idx) currentRoutes.splice(idx, 1);
    }

    for (const key of currentRoutes.values()) {
      this.routingTable.delete(key);
    }
  }

  private async getNodeList(): Promise<NodeList> {
    if (!this.elasticsearch) {
      throw new Error('You must call setup first');
    }
    const client = await this.elasticsearch.pipe(first()).toPromise();
    const params = {
      id: this.proxyDoc,
      index: this.proxyIndex,
      _source: true,
    };
    const data: ClusterDoc = await client.callAsInternalUser('get', params);
    this.updateRoutingTable(data.routing_table);
    const nodes: NodeList = new Map(Object.entries(data.nodes));
    return nodes;
  }

  private async updateNodeList(nodes: NodeList): Promise<void> {
    if (!this.elasticsearch) {
      throw new Error('You must call setup first');
    }
    const doc = {
      nodes: map2obj(nodes),
      routing_table: map2obj(this.routingTable),
    };
    const client = await this.elasticsearch.pipe(first()).toPromise();
    const params = {
      id: this.proxyDoc,
      index: this.proxyIndex,
      doc,
    };
    await client.callAsInternalUser('update', params);
  }

  private updateLocalNode(nodes: NodeList, finishTime: number): NodeList {
    nodes.set(this.nodeName, {
      lastChangedTime: finishTime,
      lastUpdate: finishTime,
    });
    return nodes;
  }

  private async mainLoop(): Promise<any> {
    const nodes = await this.getNodeList();
    const finishTime = new Date().getTime();

    for (const [key, node] of nodes.entries()) {
      if (!node || finishTime - node.lastUpdate > this.timeoutThreshold) {
        nodes.delete(key);
      } else {
        node.lastChangedTime = finishTime;
        nodes.set(key, node);
      }
    }

    this.updateNodeList(this.updateLocalNode(nodes, finishTime));
    this.setTimer();
  }
}
