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
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: FrameworkRequest,
    method: 'search',
    options?: object
  ): Promise<DatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: FrameworkRequest,
    method: 'msearch',
    options?: object
  ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
}

export interface FrameworkRequest<InternalRequest extends WrappableRequest = WrappableRequest> {
  [internalFrameworkRequest]: InternalRequest;
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
}

// tslint:disable-next-line:no-any
export interface WrappableRequest<Payload = any, Params = any, Query = any> {
  payload: Payload;
  params: Params;
  query: Query;
}

export interface DatabaseResponse {
  took: number;
  timeout: boolean;
}

export interface DatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends DatabaseResponse {
  aggregations?: Aggregations;
  hits: {
    total: number;
    hits: Hit[];
  };
}

export interface InfraDatabaseMultiResponse<Hit, Aggregation> extends DatabaseResponse {
  responses: Array<DatabaseSearchResponse<Hit, Aggregation>>;
}
