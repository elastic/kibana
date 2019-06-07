/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { v4 } from 'uuid';
import { Observable, Subscription, from } from 'rxjs';

import { PluginInitializerContext, Logger, ClusterClient, CoreSetup } from 'src/core/server';

import { ProxyPluginType } from './proxy';
import { first } from 'rxjs/operators';

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

// convert a map<string, V> to a plain javascript object of {[key:string]: val}
function map2obj<V>(map: Map<string, V>): { [key: string]: V } {
  return [...map].reduce((a, [k, v]) => Object.assign(a, { [k]: v }), {});
}

export type RoutingTable = Map<string, RoutingNode>;
type NodeList = Map<string, LivenessNode>;

export class ClusterDocClient {
  private routingTable: RoutingTable = new Map();
  private elasticsearch?: Observable<ClusterClient>;
  private updateInterval?: number;
  private timeoutThreshold: number = 15 * 1000;
  private timer: null | number = null;
  private nodeName: string;
  private configSubscription?: Subscription;

  private readonly proxyIndex = '.kibana';
  private readonly proxyDoc = 'proxy-resource-list';
  private readonly log: Logger;
  private readonly config$: Observable<ProxyPluginType>;

  constructor(initializerContext: PluginInitializerContext) {
    this.nodeName = v4();
    this.config$ = initializerContext.config.create<ProxyPluginType>();
    this.log = initializerContext.logger.get('proxy');
  }

  public async setup(core: CoreSetup) {
    this.elasticsearch = core.elasticsearch.dataClient$;
    const config = await this.config$.pipe(first()).toPromise();
    this.setConfig(config);
    this.configSubscription = this.config$.subscribe(config => {
      this.setConfig(config);
    });
  }

  public async start() {
    this.mainLoop();
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

  public getRoutingTable(): Observable<[string, RoutingNode]> {
    return from(this.routingTable);
  }

  public getNodeForResource(resource: string) {
    return this.routingTable.get(resource);
  }

  public async assignResource(resource: string, data: RoutingNode) {
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

  private setConfig(config: ProxyPluginType) {
    this.updateInterval = config.updateInterval;
    this.timeoutThreshold = config.timeoutThreshold;
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
