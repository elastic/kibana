/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { v4 } from 'uuid';
import { Observable, Subscription, pairs } from 'rxjs';
import { first } from 'rxjs/operators';

import {
  PluginInitializerContext,
  Logger,
  ClusterClient,
  ElasticsearchServiceSetup,
} from '../../../../src/core/server';

import { ProxyPluginType } from './proxy';

interface LivenessNode {
  lastUpdate: number;
}

interface NodeList {
  [key: string]: LivenessNode;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (min - max) + min);
}

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

export interface RoutingTable {
  [key: string]: RoutingNode;
}

export class ClusterDocClient {
  public nodeName: string;
  private elasticsearch?: Observable<ClusterClient>;
  private updateInterval? = 15 * 1000;
  private timeoutThreshold = 15 * 1000;
  private updateTimer: null | NodeJS.Timer = null;
  private configSubscription?: Subscription;
  private maxRetry: number = 0;

  private readonly minUpdateShuffle = 0;
  private readonly maxUpdateShuffle = 1000;
  private readonly proxyIndex = '.kibana';
  private readonly routingDoc = 'proxy-resource-list';
  private readonly heartbeatDoc = 'proxy-heartbeat-list';
  private readonly docType = '_doc';
  private readonly log: Logger;
  private readonly config$: Observable<ProxyPluginType>;

  constructor(initializerContext: PluginInitializerContext) {
    this.nodeName = v4();
    this.config$ = initializerContext.config.create<ProxyPluginType>();
    this.log = initializerContext.logger.get('proxy');
  }

  public async setup(esClient: Partial<ElasticsearchServiceSetup>) {
    this.elasticsearch = esClient.dataClient$;
    this.configSubscription = this.config$.subscribe(config => {
      this.setConfig(config);
    });
    const config = await this.config$.pipe(first()).toPromise();
    this.setConfig(config);
  }

  public async start() {
    return await this.mainLoop();
  }

  public async stop() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    await this.updateHeartbeat(true);

    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription.unsubscribe();
    this.configSubscription = undefined;
  }

  public async getNodeForResource(resource: string) {
    const table = await this.getRoutingTable();
    return table[resource];
  }

  public async getRoutingTable() {
    const client = await this.getESClient();
    const params = {
      index: this.proxyIndex,
      type: this.docType,
      id: this.routingDoc,
      source: true,
    };
    const res = await client.callAsInternalUser('get', params);
    return res._source as RoutingTable;
  }

  public async assignResource(resource: string, type: string, state: RouteState, node?: string) {
    const table = await this.getRoutingTable();
    if (table[resource]) {
      throw new Error(`${resource} already exists on ${table[resource].node}`);
    }
    const body = {
      resource: {
        type,
        state,
        node: node || this.nodeName,
      },
    };

    const client = await this.getESClient();
    const params = {
      index: this.proxyIndex,
      type: this.docType,
      id: this.routingDoc,
      body,
      retryOnConflict: this.maxRetry,
    };
    await client.callAsInternalUser('update', params);
  }

  public async unassignResource(resource: string) {
    const client = await this.getESClient();
    const body = {
      script: `if (ctx['source'].containsKey(resource)) { ctx['source'].remove(resource); }`,
      params: {
        resource,
      },
    };
    const params = {
      index: this.proxyIndex,
      type: this.docType,
      id: this.routingDoc,
      body,
      retryOnConflict: this.maxRetry,
    };
    await client.callAsInternalUser('update', params);
  }

  private async getESClient(): Promise<ClusterClient> {
    if (!this.elasticsearch) {
      const err = Boom.boomify(new Error('You must call setup first'), { statusCode: 412 });
      throw err;
    }
    const client = await this.elasticsearch.pipe(first()).toPromise();
    return client;
  }

  private setConfig(config: ProxyPluginType) {
    const update = config.updateInterval + randomInt(this.minUpdateShuffle, this.maxUpdateShuffle);
    const timeout =
      config.timeoutThreshold + randomInt(this.minUpdateShuffle, this.maxUpdateShuffle);
    this.updateInterval = update;
    this.timeoutThreshold = timeout;
    this.maxRetry = config.maxRetry;
  }

  private setTimer() {
    if (this.updateTimer) return;
    this.log.debug('Set timer to updateNodeMap');
    this.updateTimer = setTimeout(() => {
      this.log.debug('Updating heartbeat');
      this.mainLoop();
    }, this.updateInterval);
  }

  private async getHeartbeats() {
    const client = await this.getESClient();
    const params = {
      id: this.heartbeatDoc,
      type: this.docType,
      index: this.proxyIndex,
      _source: true,
    };
    const reply = await client.callAsInternalUser('get', params);
    return reply._source as NodeList;
  }

  private async updateHeartbeat(remove: boolean = false) {
    const client = await this.getESClient();
    const body = {};
    if (remove) {
      body[this.nodeName] = {
        script: `if (ctx['_source'].containsKey(resource)) { ctx['source'].remove(resource);}`,
        params: {
          resource: this.nodeName,
        },
      };
    } else {
      const currentTime = new Date().getTime();
      body[this.nodeName] = currentTime;
    }
    const params = {
      id: this.heartbeatDoc,
      type: this.docType,
      index: this.proxyIndex,
      body,
      retryOnConflict: this.maxRetry,
    };
    await client.callAsInternalUser('update', params);
  }

  /**
   * remove resources that no longer have a live nodei. since each node runs
   * this in the same way, we ignore conflicts here -- one of them will win
   * eventually, and update the correctly
   * @param nodes
   */
  private async cullDeadResources(nodes: string[]) {
    const client = await this.getESClient();
    const body = {
      script: `for (node in ctx['_source'].entrySet()) {
        if (!nodes.contains(node.getValue().get('node'))) {
          ctx['_source'].remove(node.getKey());
        }
      }`,
      params: {
        nodes,
      },
    };

    const params = {
      index: this.proxyIndex,
      type: this.docType,
      id: this.routingDoc,
      body,
    };
    await client.callAsInternalUser('update', params);
  }

  /**
   * remove nodes that are past their timeout. since each node runs this in the
   * same way, we ignore conflicts here -- one of them will win eventually
   */
  private async cullDeadNodes() {
    const client = await this.getESClient();
    const threshold = new Date().getTime() - this.timeoutThreshold;
    const body = {
      script: `for (node in ctx['_source'].entrySet()) {
        if (node.getValue() < threshold) {
          key = node.getKey();
          ctx['source'].remove(key);
        }
      }`,
      params: {
        threshold,
      },
    };
    const params = {
      id: this.heartbeatDoc,
      type: this.docType,
      index: this.proxyIndex,
      body,
    };
    await client.callAsInternalUser('update', params);
    const nodes = await this.getHeartbeats();
    await this.cullDeadResources(Object.keys(nodes));
  }

  private async mainLoop() {
    try {
      await this.updateHeartbeat();
      await this.cullDeadNodes();
    } catch (err) {
      this.log.warn('Unable to update heartbeat', err);
    } finally {
      this.setTimer();
    }
  }
}
