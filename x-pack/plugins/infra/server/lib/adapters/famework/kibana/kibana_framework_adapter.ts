/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraFrameworkRouteOptions,
  InfraWrappableRequest,
} from '../../../infra_types';
import { graphiqlHapi, graphqlHapi } from './apollo_server_hapi';

import { IStrictReply, Request, Server } from 'hapi';
import {
  internalInfraFrameworkRequest,
  wrapRequest,
} from '../../../../utils/wrap_request';

export class InfraKibanaBackendFrameworkAdapter
  implements InfraBackendFrameworkAdapter {
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

  public registerGraphQLEndpoint(
    routePath: string,
    schema: GraphQLSchema
  ): void {
    this.server.register({
      options: {
        graphqlOptions: (req: Request) => ({
          /**
           * We wrapReq because the request object has to be passed around due to kibana API
           * This provides a more protected boundry between safe and unsafe usage of this data between boundries
           */
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

  public registerRoute<
    RouteRequest extends InfraWrappableRequest,
    RouteResponse
  >(route: InfraFrameworkRouteOptions<RouteRequest, RouteResponse>) {
    const wrappedHandler = (request: any, reply: IStrictReply<RouteResponse>) =>
      route.handler(wrapRequest(request), reply);

    this.server.route({
      handler: wrappedHandler,
      method: route.method,
      path: route.path,
    });
  }

  public async callWithRequest(
    req: InfraFrameworkRequest<Request>,
    ...rest: any[]
  ) {
    const internalRequest = req[internalInfraFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const fields = await callWithRequest(internalRequest, ...rest);
    return fields;
  }
}
