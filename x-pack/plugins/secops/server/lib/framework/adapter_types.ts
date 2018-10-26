/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';

export * from '../../../common/graphql/typed_resolvers';

export const internalFrameworkRequest = Symbol('internalFrameworkRequest');

export interface FrameworkAdapter {
  version: string;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
}

export interface FrameworkRequest<InternalRequest extends WrappableRequest = WrappableRequest> {
  [internalFrameworkRequest]: InternalRequest;
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
}

export interface WrappableRequest<Payload = any, Params = any, Query = any> {
  payload: Payload;
  params: Params;
  query: Query;
}
