/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { IRouteAdditionalConfigurationOptions, IStrictReply } from 'hapi';

export const internalInfraFrameworkRequest = Symbol('internalInfraFrameworkRequest');

export interface InfraBackendFrameworkAdapter {
  version: string;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
  registerRoute<RouteRequest extends InfraWrappableRequest, RouteResponse>(
    route: InfraFrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: InfraFrameworkRequest,
    method: 'search',
    options?: object
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: InfraFrameworkRequest,
    method: 'msearch',
    options?: object
  ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    req: InfraFrameworkRequest,
    method: 'fieldCaps',
    options?: object
  ): Promise<InfraDatabaseFieldCapsResponse>;
  callWithRequest(
    req: InfraFrameworkRequest,
    method: string,
    options?: object
  ): Promise<InfraDatabaseSearchResponse>;
}

export interface InfraFrameworkRequest<
  InternalRequest extends InfraWrappableRequest = InfraWrappableRequest
> {
  [internalInfraFrameworkRequest]: InternalRequest;
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
}

export interface InfraWrappableRequest<Payload = any, Params = any, Query = any> {
  payload: Payload;
  params: Params;
  query: Query;
}

export interface InfraFrameworkPluginOptions {
  register: any;
  options: any;
}

export interface InfraFrameworkRouteOptions<
  RouteRequest extends InfraWrappableRequest,
  RouteResponse
> {
  path: string;
  method: string | string[];
  vhost?: string;
  handler: InfraFrameworkRouteHandler<RouteRequest, RouteResponse>;
  config?: Pick<
    IRouteAdditionalConfigurationOptions,
    Exclude<keyof IRouteAdditionalConfigurationOptions, 'handler'>
  >;
}

export type InfraFrameworkRouteHandler<
  RouteRequest extends InfraWrappableRequest,
  RouteResponse
> = (request: InfraFrameworkRequest<RouteRequest>, reply: IStrictReply<RouteResponse>) => void;

export interface InfraDatabaseResponse {
  took: number;
  timeout: boolean;
}

export interface InfraDatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends InfraDatabaseResponse {
  aggregations?: Aggregations;
  hits: {
    total: number;
    hits: Hit[];
  };
}

export interface InfraDatabaseMultiResponse<Hit, Aggregation> extends InfraDatabaseResponse {
  responses: Array<InfraDatabaseSearchResponse<Hit, Aggregation>>;
}

export interface InfraDatabaseFieldCapsResponse extends InfraDatabaseResponse {
  fields: InfraFieldsResponse;
}

export interface InfraFieldsResponse {
  [name: string]: InfraFieldDef;
}

export interface InfraFieldDetails {
  searchable: boolean;
  aggregatable: boolean;
  type: string;
}

export interface InfraFieldDef {
  [type: string]: InfraFieldDetails;
}
