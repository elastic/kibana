/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent as HTTPSAgent } from 'https';
import { Agent as HTTPAgent } from 'http';
import { URL } from 'url';
import { promisify } from 'util';
import { readFile } from 'fs';
import crypto from 'crypto';

// `crypto` type definitions doesn't currently include `crypto.constants`, see
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/fa5baf1733f49cf26228a4e509914572c1b74adf/types/node/v6/index.d.ts#L3412
const cryptoConstants = (crypto as any).constants;

const readFileAsync = promisify(readFile);

import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import Wreck from 'wreck';
import { schema, TypeOf } from '@kbn/config-schema';

import {
  Plugin,
  PluginInitializerContext,
  Logger,
  CoreSetup,
  KibanaRequest,
} from 'src/core/server';
import { SslConfig } from 'src/core/server/http/ssl_config';
import { HttpServerSetup } from 'src/core/server/http/http_server';

import { RouteState, RoutingNode, ClusterDocClient } from './cluster_doc';

export interface ProxyServiceSetup {
  httpSetup: HttpServerSetup;
}

export interface ProxyServiceStart {
  on: (event: string | symbol, listener: (...args: any[]) => void) => ClusterDocClient;
  off: (event: string | symbol, listener: (...args: any[]) => void) => ClusterDocClient;
  once: (event: string | symbol, listener: (...args: any[]) => void) => ClusterDocClient;
  removeAllListeners: (event?: string | symbol) => ClusterDocClient;
  assignResource: (
    resource: string,
    type: string,
    state: RouteState,
    node?: string
  ) => Promise<void>;
  unassignResource: (resource: string) => Promise<void>;
  proxyResource: (resource: string) => (req: KibanaRequest) => Promise<any>;
  proxyRequest: (req: KibanaRequest, resource: string) => Promise<any>;
  getAllocation: () => Observable<[string, RoutingNode]>;
}

export const ProxyConfig = {
  schema: schema.object({
    updateInterval: schema.number(),
    timeoutThreshold: schema.number(),
    port: schema.number(),
    maxRetry: schema.number(),
    requestBackoff: schema.number(),
    cert: schema.string(),
    key: schema.string(),
    ca: schema.string(),
    cipherSuites: schema.arrayOf(schema.string(), {
      defaultValue: cryptoConstants.defaultCoreCipherList.split(':'),
    }),
    supportedProtocols: schema.arrayOf(
      schema.oneOf([schema.literal('TLSv1'), schema.literal('TLSv1.1'), schema.literal('TLSv1.2')]),
      { defaultValue: ['TLSv1.1', 'TLSv1.2'], minSize: 1 }
    ),
  }),
};

export type ProxyPluginType = TypeOf<typeof ProxyConfig.schema>;

export class ProxyService implements Plugin<ProxyServiceSetup, ProxyServiceStart> {
  public nodeName: string;
  private configSubscription?: Subscription;
  private clusterDocClient: ClusterDocClient;
  private maxRetry = 0;
  private requestBackoff = 0;
  private port = 0;

  private httpsAgent: HTTPSAgent = new HTTPSAgent({ keepAlive: true });
  private httpAgent: HTTPAgent = new HTTPAgent({ keepAlive: true });
  private allowUnauthAgent: HTTPAgent = new HTTPAgent({ keepAlive: true });
  private wreck: typeof Wreck = Wreck;
  private readonly log: Logger;
  private readonly config$: Observable<ProxyPluginType>;

  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<ProxyPluginType>();
    this.log = initializerContext.logger.get('proxy');
    this.clusterDocClient = new ClusterDocClient(initializerContext);
    this.nodeName = this.clusterDocClient.nodeName;
  }

  public async setup(core: CoreSetup, plugins: {}) {
    await this.clusterDocClient.setup(core.elasticsearch);

    this.configSubscription = this.config$.subscribe(config => {
      this.setConfig(config);
    });
    const config = await this.config$.pipe(first()).toPromise();
    this.setConfig(config);

    const ssl = await this.configureSSL(config);
    this.wreck = Wreck.defaults({
      agent: {
        https: this.httpsAgent,
        http: this.httpAgent,
        httpsAllowUnauthorized: this.allowUnauthAgent,
      },
    });

    const httpSetup = await core.http.createNewServer({
      port: config.port,
      ssl,
    });

    const setup: ProxyServiceSetup = {
      httpSetup,
    };

    return setup;
  }

  private async configureSSL(config: ProxyPluginType) {
    let tlsCert;
    let tlsKey;
    let tlsCa;

    try {
      [tlsCert, tlsKey, tlsCa] = await Promise.all([
        readFileAsync(config.cert),
        readFileAsync(config.key),
        readFileAsync(config.ca),
      ]);
    } catch (err) {
      this.log.fatal('Unable to read SSL cerificate information', err);
      throw new Error('You must provide valid paths for cert, key and ca');
    }

    this.httpsAgent = new HTTPSAgent({
      keepAlive: true,
      cert: tlsCert,
      key: tlsKey,
      ca: tlsCa,
    });

    const ssl = new SslConfig({
      enabled: true,
      redirectHttpFromPort: this.port,
      certificate: tlsCert.toString(),
      key: tlsKey.toString(),
      certificateAuthorities: [tlsCa.toString()],
      cipherSuites: config.cipherSuites,
      keyPassphrase: undefined,
      supportedProtocols: config.supportedProtocols,
      requestCert: true,
    });
    return ssl;
  }

  private setConfig(config: ProxyPluginType) {
    this.port = config.port;
    this.maxRetry = config.maxRetry;
    this.requestBackoff = config.requestBackoff;
  }

  public async start() {
    await this.clusterDocClient.start();
    const start: ProxyServiceStart = {
      on: this.clusterDocClient.on.bind(this.clusterDocClient),
      off: this.clusterDocClient.off.bind(this.clusterDocClient),
      once: this.clusterDocClient.once.bind(this.clusterDocClient),
      removeAllListeners: this.clusterDocClient.removeAllListeners.bind(this.clusterDocClient),
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

  public async assignResource(
    resource: string,
    type: string,
    state: RouteState,
    node?: string
  ): Promise<void> {
    await this.clusterDocClient.assignResource(resource, type, state, node);
  }

  public async unassignResource(resource: string) {
    await this.clusterDocClient.unassignResource(resource);
  }

  public proxyResource(resource: string): (req: KibanaRequest) => Promise<any> {
    return (req: KibanaRequest) => {
      return this.proxyRequest(req, resource);
    };
  }

  // @TODO update to allow passing of request parametsrs
  public async proxyRequest(req: KibanaRequest, resource?: string, retryCount = 0): Promise<any> {
    const method = req.route.method;
    const url = new URL(req.url.toString());
    const headers = req.getFilteredHeaders([]);
    const body = req.body;
    resource = resource || url.pathname;
    const node = this.clusterDocClient.getNodeForResource(resource);

    if (!node || node.state === RouteState.Closed) {
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
        return await new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const reply = await this.proxyRequest(req, resource, ++retryCount);
              resolve(reply);
            } catch (err) {
              reject(err);
            }
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
