/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { Request, Server } from 'hapi';

import {
  FrameworkAdapter,
  FrameworkRequest,
  internalFrameworkRequest,
  WrappableRequest,
} from './adapter_types';
import { graphiqlHapi, graphqlHapi } from './apollo_server_hapi';

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
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
