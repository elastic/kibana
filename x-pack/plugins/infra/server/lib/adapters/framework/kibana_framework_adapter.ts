/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { Legacy } from 'kibana';

import { GenericParams } from 'elasticsearch';
import { InfraMetricModel } from '../metrics/adapter_types';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkIndexPatternsService,
  InfraFrameworkRequest,
  InfraFrameworkRouteOptions,
  InfraResponse,
  InfraTSVBResponse,
  InfraWrappableRequest,
  internalInfraFrameworkRequest,
} from './adapter_types';
import {
  graphiqlHapi,
  graphqlHapi,
  HapiGraphiQLPluginOptions,
  HapiGraphQLPluginOptions,
} from './apollo_server_hapi';

export class InfraKibanaBackendFrameworkAdapter implements InfraBackendFrameworkAdapter {
  public version: string;
  private server: Legacy.Server;

  constructor(hapiServer: Legacy.Server) {
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
    this.server.register<HapiGraphQLPluginOptions>({
      options: {
        graphqlOptions: (req: Legacy.Request) => ({
          context: { req: wrapRequest(req) },
          schema,
        }),
        path: routePath,
      },
      plugin: graphqlHapi,
    });

    this.server.register<HapiGraphiQLPluginOptions>({
      options: {
        graphiqlOptions: {
          endpointURL: routePath,
          passHeader: `'kbn-version': '${this.version}'`,
        },
        path: `${routePath}/graphiql`,
      },
      plugin: graphiqlHapi,
    });
  }

  public registerRoute<
    RouteRequest extends InfraWrappableRequest,
    RouteResponse extends InfraResponse
  >(route: InfraFrameworkRouteOptions<RouteRequest, RouteResponse>) {
    const wrappedHandler = (request: any, h: Legacy.ResponseToolkit) =>
      route.handler(wrapRequest(request), h);

    this.server.route({
      handler: wrappedHandler,
      method: route.method,
      path: route.path,
    });
  }

  public async callWithRequest(
    req: InfraFrameworkRequest<Legacy.Request>,
    endpoint: string,
    params: GenericParams,
    ...rest: any[]
  ) {
    const internalRequest = req[internalInfraFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const fields = await callWithRequest(internalRequest, endpoint, params, ...rest);
    return fields;
  }

  public getIndexPatternsService(
    request: InfraFrameworkRequest<Legacy.Request>
  ): InfraFrameworkIndexPatternsService {
    if (!isServerWithIndexPatternsServiceFactory(this.server)) {
      throw new Error('Failed to access indexPatternsService for the request');
    }
    return this.server.indexPatternsServiceFactory({
      callCluster: async (method: string, args: [GenericParams], ...rest: any[]) => {
        const fieldCaps = await this.callWithRequest(
          request,
          method,
          { ...args, allowNoIndices: true } as GenericParams,
          ...rest
        );
        return fieldCaps;
      },
    });
  }

  public async makeTSVBRequest(
    req: InfraFrameworkRequest<Legacy.Request>,
    model: InfraMetricModel,
    timerange: { min: number; max: number },
    filters: any[]
  ) {
    const internalRequest = req[internalInfraFrameworkRequest];
    const server = internalRequest.server;
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

    const res = await server.inject(request);
    if (res.statusCode !== 200) {
      throw res;
    }

    return res.result as InfraTSVBResponse;
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

interface ServerWithIndexPatternsServiceFactory extends Legacy.Server {
  indexPatternsServiceFactory(options: {
    callCluster: (...args: any[]) => any;
  }): InfraFrameworkIndexPatternsService;
}

const isServerWithIndexPatternsServiceFactory = (
  server: Legacy.Server
): server is ServerWithIndexPatternsServiceFactory =>
  typeof (server as any).indexPatternsServiceFactory === 'function';
