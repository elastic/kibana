/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { IStrictReply, Request, Server } from 'hapi';

import { InfraMetricModel } from '../metrics/adapter_types';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkIndexPatternsService,
  InfraFrameworkRequest,
  InfraFrameworkRouteOptions,
  InfraTSVBResponse,
  InfraWrappableRequest,
  internalInfraFrameworkRequest,
} from './adapter_types';
import { graphiqlHapi, graphqlHapi } from './apollo_server_hapi';

export class InfraKibanaBackendFrameworkAdapter implements InfraBackendFrameworkAdapter {
  public version: string;
  private server: Server;

  constructor(hapiServer: Server) {
    this.server = hapiServer;
    this.version = hapiServer.plugins.kibana.status.plugin.version;
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

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.register({
      options: {
        graphqlOptions: (req: Request) => ({
          context: { req: wrapRequest(req) },
          schema,
        }),
        path: routePath,
      },
      register: graphqlHapi,
    });

    this.server.register({
      options: {
        graphiqlOptions: {
          endpointURL: routePath,
          passHeader: `'kbn-version': '${this.version}'`,
        },
        path: `${routePath}/graphiql`,
      },
      register: graphiqlHapi,
    });
  }

  public registerRoute<RouteRequest extends InfraWrappableRequest, RouteResponse>(
    route: InfraFrameworkRouteOptions<RouteRequest, RouteResponse>
  ) {
    const wrappedHandler = (request: any, reply: IStrictReply<RouteResponse>) =>
      route.handler(wrapRequest(request), reply);

    this.server.route({
      handler: wrappedHandler,
      method: route.method,
      path: route.path,
    });
  }

  public async callWithRequest(req: InfraFrameworkRequest<Request>, ...rest: any[]) {
    const internalRequest = req[internalInfraFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const fields = await callWithRequest(internalRequest, ...rest);
    return fields;
  }

  public getIndexPatternsService(
    request: InfraFrameworkRequest<Request>
  ): InfraFrameworkIndexPatternsService {
    if (!isServerWithIndexPatternsServiceFactory(this.server)) {
      throw new Error('Failed to access indexPatternsService for the request');
    }
    return this.server.indexPatternsServiceFactory({
      callCluster: async (method: string, args: [object], ...rest: any[]) => {
        const fieldCaps = await this.callWithRequest(
          request,
          method,
          { ...args, allowNoIndices: true },
          ...rest
        );
        return fieldCaps;
      },
    });
  }

  public async makeTSVBRequest(
    req: InfraFrameworkRequest<Request>,
    model: InfraMetricModel,
    timerange: { min: number; max: number },
    filters: any[]
  ) {
    const internalRequest = req[internalInfraFrameworkRequest];
    const server = internalRequest.server;
    return new Promise<InfraTSVBResponse>((resolve, reject) => {
      const request = {
        url: '/api/metrics/vis/data',
        method: 'POST',
        headers: internalRequest.headers,
        payload: {
          timerange,
          panels: [model],
          filters,
        },
      };
      server.inject(request, res => {
        if (res.statusCode !== 200) {
          return reject(res);
        }
        resolve(res.result);
      });
    });
  }
}

export function wrapRequest<InternalRequest extends InfraWrappableRequest>(
  req: InternalRequest
): InfraFrameworkRequest<InternalRequest> {
  const { params, payload, query } = req;

  return {
    [internalInfraFrameworkRequest]: req,
    params,
    payload,
    query,
  };
}

interface ServerWithIndexPatternsServiceFactory extends Server {
  indexPatternsServiceFactory(options: {
    callCluster: (...args: any[]) => any;
  }): InfraFrameworkIndexPatternsService;
}

const isServerWithIndexPatternsServiceFactory = (
  server: Server
): server is ServerWithIndexPatternsServiceFactory =>
  typeof (server as any).indexPatternsServiceFactory === 'function';
