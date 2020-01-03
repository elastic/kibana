/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { schema as kbnSchema } from '@kbn/config-schema';
import { runHttpQuery } from 'apollo-server-core';
import { UptimeCoreSetup } from './adapter_types';
import { UMBackendFrameworkAdapter } from './adapter_types';
import { UMKibanaRoute } from '../../../rest_api';

export class UMKibanaBackendFrameworkAdapter implements UMBackendFrameworkAdapter {
  constructor(private readonly server: UptimeCoreSetup) {
    this.server = server;
  }

  public registerRoute({ handler, method, options, path, validate }: UMKibanaRoute) {
    const routeDefinition = {
      path,
      validate,
      options,
    };
    switch (method) {
      case 'GET':
        this.server.router.get(routeDefinition, handler);
        break;
      case 'POST':
        this.server.router.post(routeDefinition, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.router.post(
      {
        path: routePath,
        validate: {
          body: kbnSchema.object({
            operationName: kbnSchema.nullable(kbnSchema.string()),
            query: kbnSchema.string(),
            variables: kbnSchema.recordOf(kbnSchema.string(), kbnSchema.any()),
          }),
        },
        options: {
          tags: ['access:uptime'],
        },
      },
      async (context, request, resp): Promise<any> => {
        const {
          core: {
            elasticsearch: {
              dataClient: { callAsCurrentUser },
            },
          },
        } = context;
        const options = {
          graphQLOptions: (_req: any) => {
            return {
              context: { ...context, APICaller: callAsCurrentUser },
              schema,
            };
          },
          path: routePath,
          route: {
            tags: ['access:uptime'],
          },
        };
        try {
          const query = request.body as Record<string, any>;

          const graphQLResponse = await runHttpQuery([request], {
            method: 'POST',
            options: options.graphQLOptions,
            query,
          });

          return resp.ok({
            body: graphQLResponse,
            headers: {
              'content-type': 'application/json',
            },
          });
        } catch (error) {
          if (error.isGraphQLError === true) {
            return resp.internalError({
              body: { message: error.message },
              headers: { 'content-type': 'application/json' },
            });
          }
          return resp.internalError();
        }
      }
    );
  }
}
