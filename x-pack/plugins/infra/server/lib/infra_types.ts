/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { IRouteAdditionalConfigurationOptions, IStrictReply } from 'hapi';
import { internalInfraFrameworkRequest } from '../utils/wrap_request';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraNodesDomain } from './domains/nodes_domain';

import {
  InfraContainer,
  InfraFilter,
  InfraGroupBy,
  InfraGroupByFilter,
  InfraGroupByType,
  InfraHost,
  InfraIndexPattern,
  InfraPod,
  InfraResponse,
  InfraService,
  InfraTimerange,
} from '../../common/graphql/types';

export interface InfraDomainLibs {
  fields: InfraFieldsDomain;
  nodes: InfraNodesDomain;
}

export interface InfraBackendLibs extends InfraDomainLibs {
  framework: InfraBackendFrameworkAdapter;
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

export interface InfraFieldDetails {
  searchable: boolean;
  aggregatable: boolean;
  type: string;
}

export interface InfraFieldDef {
  [type: string]: InfraFieldDetails;
}

export interface InfraFieldsResponse {
  [name: string]: InfraFieldDef;
}

export interface InfraContext {
  req: InfraFrameworkRequest;
  libs: InfraBackendLibs;
}

export interface FieldCapsResponse {
  fields: {
    [fieldName: string]: {
      [fieldType: string]: {
        searchable: boolean;
        aggregatable: boolean;
        indices?: string[];
        non_aggregatable_indices?: string[];
        non_searchable_indices?: string[];
      };
    };
  };
}

export interface FieldsAdapter {
  getFieldCaps(
    req: InfraFrameworkRequest,
    indexPattern: string | string[]
  ): Promise<FieldCapsResponse>;
}

export interface InfraHostsFieldsObject {
  name?: any;
  metrics?: any;
  groups?: [any];
}

export interface InfraNodesAdapter {
  getNodes(req: InfraFrameworkRequest, options: InfraNodeRequestOptions): Promise<InfraResponse>;
}

export type InfraESQuery =
  | InfraESBoolQuery
  | InfraESRangeQuery
  | InfraESExistsQuery
  | InfraESQueryStringQuery
  | InfraESMatchQuery;

export interface InfraESExistsQuery {
  exists: { field: string };
}

export interface InfraESQueryStringQuery {
  query_string: {
    query: string;
    analyze_wildcard: boolean;
  };
}

export interface InfraESRangeQuery {
  range: {
    [name: string]: {
      gte: number;
      lte: number;
      format: string;
    };
  };
}

export interface InfraESMatchQuery {
  match: {
    [name: string]: {
      query: string;
    };
  };
}

export interface InfraESBoolQuery {
  bool: {
    must?: InfraESQuery[];
    should?: InfraESQuery[];
    filter?: InfraESQuery[];
  };
}

export interface InfraESMSearchHeader {
  index: string;
}

export interface InfraESSearchBody {
  query?: object;
  aggregations?: object;
  aggs?: object;
  size?: number;
}

export type InfraESMSearchBody = InfraESSearchBody | InfraESMSearchHeader;

export enum InfraNodesKey {
  hosts = 'hosts',
  pods = 'pods',
  containers = 'containers',
  services = 'services',
}

export interface InfraNodeRequestOptions {
  nodeType: InfraNodeType;
  nodesKey: InfraNodesKey;
  indexPattern: InfraIndexPattern;
  timerange: InfraTimerange;
  groupBy: InfraGroupBy[];
  metrics: string[];
  filters: InfraFilter[];
}

export interface InfraNodesAggregations {
  waffle: {
    nodes: {
      buckets: InfraBucket[];
    };
  };
}

export type InfraProcessorTransformer<T> = (doc: T) => T;

export type InfraProcessorChainFn<T> = (
  next: InfraProcessorTransformer<T>
) => InfraProcessorTransformer<T>;

export type InfraProcessor<O, T> = (options: O) => InfraProcessorChainFn<T>;

export interface InfraProcesorRequestOptions {
  nodeOptions: InfraNodeRequestOptions;
  partitionId: number;
  numberOfPartitions: number;
  nodeField: string;
}

export interface InfraGroupByFilters {
  id: string /** The UUID for the group by object */;
  type: InfraGroupByType /** The type of aggregation to use to bucket the groups */;
  label?:
    | string
    | null /** The label to use in the results for the group by for the terms group by */;
  filters: InfraGroupByFilter[] /** The filters to use for the group by aggregation, this is ignored by the terms group by */;
}

export interface InfraGroupByTerms {
  id: string /** The UUID for the group by object */;
  type: InfraGroupByType /** The type of aggregation to use to bucket the groups */;
  label?:
    | string
    | null /** The label to use in the results for the group by for the terms group by */;
  field: string;
}

export interface InfraBucketWithKey {
  key: string;
  doc_count: number;
}

export interface InfraBucketWithAggs {
  [name: string]: {
    buckets: InfraBucket[];
  };
}

export type InfraBucket = InfraBucketWithAggs & InfraBucketWithKey;

export enum InfraNodeType {
  host = 'host',
  pod = 'pod',
  container = 'container',
  service = 'service',
}

export interface InfraGroupWithNodes {
  name: string;
  nodes: InfraNode[];
}

export interface InfraGroupWithSubGroups {
  name: string;
  groups: InfraGroupWithNodes[];
}

export type InfraNodeGroup = InfraGroupWithNodes | InfraGroupWithSubGroups;

export type InfraNode = InfraHost | InfraPod | InfraContainer | InfraService;

export interface InfraNodesResponse {
  total?: number;
}

export interface InfraGroupsResponse {
  total: number;
  groups: InfraNodeGroup[];
}

export interface InfraNodesOnlyResponse {
  total: number;
  nodes: InfraNode[];
}
