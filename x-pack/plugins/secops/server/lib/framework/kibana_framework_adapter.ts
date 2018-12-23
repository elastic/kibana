/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { Request, Server } from 'hapi';

import { GenericParams } from 'elasticsearch';
import { Legacy } from 'kibana';
import {
  graphiqlHapi,
  graphqlHapi,
  HapiGraphiQLPluginOptions,
  HapiGraphQLPluginOptions,
} from './apollo_server_hapi';
import {
  FrameworkAdapter,
  FrameworkIndexPatternsService,
  FrameworkRequest,
  internalFrameworkRequest,
  WrappableRequest,
} from './types';

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
  public version: string;
  private server: Server;

  constructor(hapiServer: Server) {
    this.server = hapiServer;
    this.version = hapiServer.plugins.kibana.status.plugin.version;
  }

  // tslint:disable-next-line:no-any
  public async callWithRequest(
    req: FrameworkRequest<Legacy.Request>,
    endpoint: string,
    params: GenericParams,
    // tslint:disable-next-line:no-any
    ...rest: any[]
  ) {
    const internalRequest = req[internalFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const fields = await callWithRequest(internalRequest, endpoint, params, ...rest);
    return fields;
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
        graphqlOptions: (req: Request) => ({
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

  public getIndexPatternsService(
    request: FrameworkRequest<Request>
  ): FrameworkIndexPatternsService {
    if (!isServerWithIndexPatternsServiceFactory(this.server)) {
      throw new Error('Failed to access indexPatternsService for the request');
    }
    return this.server.indexPatternsServiceFactory({
      // tslint:disable-next-line:no-any
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
}

export function wrapRequest<InternalRequest extends WrappableRequest>(
  req: InternalRequest
): FrameworkRequest<InternalRequest> {
  const { params, payload, query } = req;

  return {
    [internalFrameworkRequest]: req,
    params,
    payload,
    query,
  };
}

interface ServerWithIndexPatternsServiceFactory extends Server {
  indexPatternsServiceFactory(options: {
    // tslint:disable-next-line:no-any
    callCluster: (...args: any[]) => any;
  }): FrameworkIndexPatternsService;
}

const isServerWithIndexPatternsServiceFactory = (
  server: Server
): server is ServerWithIndexPatternsServiceFactory =>
  // tslint:disable-next-line:no-any
  typeof (server as any).indexPatternsServiceFactory === 'function';
