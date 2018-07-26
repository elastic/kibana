/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as GraphiQL from 'apollo-server-module-graphiql';
import Boom from 'boom';
import { IReply, Request, Server } from 'hapi';

import { GraphQLOptions, runHttpQuery } from 'apollo-server-core';

export interface IRegister {
  (server: Server, options: any, next: () => void): void;
  attributes: {
    name: string;
    version?: string;
  };
}

export type HapiOptionsFunction = (req?: Request) => GraphQLOptions | Promise<GraphQLOptions>;

export interface HapiPluginOptions {
  path: string;
  vhost?: string;
  route?: any;
  graphqlOptions: GraphQLOptions | HapiOptionsFunction;
}

export const graphqlHapi: IRegister = Object.assign(
  (server: Server, options: HapiPluginOptions, next: () => void) => {
    if (!options || !options.graphqlOptions) {
      throw new Error('Apollo Server requires options.');
    }

    server.route({
      config: options.route || {},
      handler: async (request: Request, reply: IReply) => {
        try {
          const gqlResponse = await runHttpQuery([request], {
            method: request.method.toUpperCase(),
            options: options.graphqlOptions,
            query: request.method === 'post' ? request.payload : request.query,
          });

          return reply(gqlResponse).type('application/json');
        } catch (error) {
          if ('HttpQueryError' !== error.name) {
            const queryError = Boom.wrap(error);

            queryError.output.payload.message = error.message;

            return reply(queryError);
          }

          if (error.isGraphQLError === true) {
            return reply(error.message)
              .code(error.statusCode)
              .type('application/json');
          }

          const genericError = Boom.create(error.statusCode, error.message);

          if (error.headers) {
            Object.keys(error.headers).forEach(header => {
              genericError.output.headers[header] = error.headers[header];
            });
          }

          // Boom hides the error when status code is 500

          genericError.output.payload.message = error.message;

          throw genericError;
        }
      },
      method: ['GET', 'POST'],
      path: options.path || '/graphql',
      vhost: options.vhost || undefined,
    });

    return next();
  },
  {
    attributes: {
      name: 'graphql',
    },
  }
);

export type HapiGraphiQLOptionsFunction = (
  req?: Request
) => GraphiQL.GraphiQLData | Promise<GraphiQL.GraphiQLData>;

export interface HapiGraphiQLPluginOptions {
  path: string;

  route?: any;

  graphiqlOptions: GraphiQL.GraphiQLData | HapiGraphiQLOptionsFunction;
}

export const graphiqlHapi: IRegister = Object.assign(
  (server: Server, options: HapiGraphiQLPluginOptions) => {
    if (!options || !options.graphiqlOptions) {
      throw new Error('Apollo Server GraphiQL requires options.');
    }

    server.route({
      config: options.route || {},
      handler: async (request: Request, reply: IReply) => {
        const graphiqlString = await GraphiQL.resolveGraphiQLString(
          request.query,
          options.graphiqlOptions,
          request
        );

        return reply(graphiqlString).type('text/html');
      },
      method: 'GET',
      path: options.path || '/graphiql',
    });
  },
  {
    attributes: {
      name: 'graphiql',
    },
  }
);
