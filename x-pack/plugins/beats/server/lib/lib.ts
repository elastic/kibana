/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from './lib';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouteAdditionalConfigurationOptions, IStrictReply } from 'hapi';
import { internalFrameworkRequest } from '../utils/wrap_request';
import { CMBeatsDomain } from './domains/beats';
import { CMTagsDomain } from './domains/tags';
import { CMTokensDomain } from './domains/tokens';

import { ConfigurationBlockTypes } from '../../common/constants';

export interface CMDomainLibs {
  beats: CMBeatsDomain;
  tags: CMTagsDomain;
  tokens: CMTokensDomain;
}

export interface CMServerLibs extends CMDomainLibs {
  framework: BackendFrameworkAdapter;
  database: DatabaseAdapter;
}

interface CMReturnedTagAssignment {
  status: number | null;
  result?: string;
}

export interface CMAssignmentReturn {
  assignments: CMReturnedTagAssignment[];
}

export interface CMRemovalReturn {
  removals: CMReturnedTagAssignment[];
}

export interface ConfigurationBlock {
  type: ConfigurationBlockTypes;
  block_yml: string;
}

export interface CMBeat {
  id: string;
  access_token: string;
  verified_on?: string;
  type: string;
  version?: string;
  host_ip: string;
  host_name: string;
  ephemeral_id?: string;
  local_configuration_yml?: string;
  tags?: string[];
  central_configuration_yml?: string;
  metadata?: {};
}

export interface BeatTag {
  id: string;
  configuration_blocks: ConfigurationBlock[];
}

export interface EnrollmentToken {
  token: string | null;
  expires_on: string;
}

export interface KbnElasticSearchCluster {
  callWithInternalUser(esMethod: string, options: {}): Promise<any>;
  callWithRequest(
    req: FrameworkRequest,
    esMethod: string,
    options: {}
  ): Promise<any>;
}

export interface KbnElasticSearch {
  getCluster(clusterName: string): KbnElasticSearchCluster;
}

export interface CMTokensAdapter {
  deleteEnrollmentToken(enrollmentToken: string): Promise<void>;
  getEnrollmentToken(enrollmentToken: string): Promise<EnrollmentToken>;
  upsertTokens(
    req: FrameworkRequest,
    tokens: EnrollmentToken[]
  ): Promise<EnrollmentToken[]>;
}

export interface DatabaseAdapter {
  putTemplate(
    req: FrameworkRequest | null,
    params: PutTemplateParams
  ): Promise<any>;
  get<Source>(
    req: FrameworkRequest | null,
    params: GetParams
  ): Promise<GetDocumentResponse<Source>>;
  create(
    req: FrameworkRequest | null,
    params: CreateDocumentParams
  ): Promise<CreateDocumentResponse>;
  index<T>(
    req: FrameworkRequest | null,
    params: IndexDocumentParams<T>
  ): Promise<IndexDocumentResponse>;
  delete(
    req: FrameworkRequest | null,
    params: DeleteDocumentParams
  ): Promise<DeleteDocumentResponse>;
  mget<T>(
    req: FrameworkRequest | null,
    params: MGetParams
  ): Promise<MGetResponse<T>>;
  bulk(
    req: FrameworkRequest | null,
    params: BulkIndexDocumentsParams
  ): Promise<BulkResponse>;
  search<T>(
    req: FrameworkRequest | null,
    params: SearchParams
  ): Promise<SearchResponse<T>>;
}

export interface SearchParams extends GenericParams {
  analyzer?: string;
  analyzeWildcard?: boolean;
  defaultOperator?: DefaultOperator;
  df?: string;
  explain?: boolean;
  storedFields?: NameList;
  docvalueFields?: NameList;
  fielddataFields?: NameList;
  from?: number;
  ignoreUnavailable?: boolean;
  allowNoIndices?: boolean;
  expandWildcards?: ExpandWildcards;
  lenient?: boolean;
  lowercaseExpandedTerms?: boolean;
  preference?: string;
  q?: string;
  routing?: NameList;
  scroll?: string;
  searchType?: 'query_then_fetch' | 'dfs_query_then_fetch';
  size?: number;
  sort?: NameList;
  _source?: NameList;
  _sourceExclude?: NameList;
  _sourceInclude?: NameList;
  terminateAfter?: number;
  stats?: NameList;
  suggestField?: string;
  suggestMode?: 'missing' | 'popular' | 'always';
  suggestSize?: number;
  suggestText?: string;
  timeout?: string;
  trackScores?: boolean;
  version?: boolean;
  requestCache?: boolean;
  index?: NameList;
  type?: NameList;
}

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: number;
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: T;
      _version?: number;
      _explanation?: Explanation;
      fields?: any;
      highlight?: any;
      inner_hits?: any;
      sort?: string[];
    }>;
  };
  aggregations?: any;
}

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

export interface GetDocumentResponse<Source> {
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  found: boolean;
  _source: Source;
}

export interface BulkResponse {
  took: number;
  errors: boolean;
  items: Array<
    DeleteDocumentResponse | IndexDocumentResponse | UpdateDocumentResponse
  >;
}

export interface BulkIndexDocumentsParams extends GenericParams {
  waitForActiveShards?: string;
  refresh?: Refresh;
  routing?: string;
  timeout?: string;
  type?: string;
  fields?: NameList;
  _source?: NameList;
  _sourceExclude?: NameList;
  _sourceInclude?: NameList;
  pipeline?: string;
  index?: string;
}

export interface MGetParams extends GenericParams {
  storedFields?: NameList;
  preference?: string;
  realtime?: boolean;
  refresh?: boolean;
  _source?: NameList;
  _sourceExclude?: NameList;
  _sourceInclude?: NameList;
  index: string;
  type?: string;
}

export interface MGetResponse<T> {
  docs?: Array<GetResponse<T>>;
}

export interface PutTemplateParams extends GenericParams {
  id: string;
  body: any;
}

export interface DeleteDocumentParams extends GenericParams {
  waitForActiveShards?: string;
  parent?: string;
  refresh?: Refresh;
  routing?: string;
  timeout?: string;
  version?: number;
  versionType?: VersionType;
  index: string;
  type: string;
  id: string;
}

export interface IndexDocumentResponse {
  found: boolean;
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  result: string;
}

export interface UpdateDocumentResponse {
  found: boolean;
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  result: string;
}

export interface DeleteDocumentResponse {
  found: boolean;
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  result: string;
}

export interface IndexDocumentParams<T> extends GenericParams {
  waitForActiveShards?: string;
  opType?: 'index' | 'create';
  parent?: string;
  refresh?: string;
  routing?: string;
  timeout?: string;
  timestamp?: Date | number;
  ttl?: string;
  version?: number;
  versionType?: VersionType;
  pipeline?: string;
  id?: string;
  index: string;
  type: string;
  body: T;
}

export interface GetResponse<T> {
  found: boolean;
  _source: T;
}
export interface CreateDocumentParams extends GenericParams {
  waitForActiveShards?: string;
  parent?: string;
  refresh?: Refresh;
  routing?: string;
  timeout?: string;
  timestamp?: Date | number;
  ttl?: string;
  version?: number;
  versionType?: VersionType;
  pipeline?: string;
  id?: string;
  index: string;
  type: string;
}

export interface CreateDocumentResponse {
  created: boolean;
  result: string;
}

export interface DeleteDocumentParams extends GenericParams {
  waitForActiveShards?: string;
  parent?: string;
  refresh?: Refresh;
  routing?: string;
  timeout?: string;
  version?: number;
  versionType?: VersionType;
  index: string;
  type: string;
  id: string;
}

export interface GetParams extends GenericParams {
  storedFields?: NameList;
  parent?: string;
  preference?: string;
  realtime?: boolean;
  refresh?: boolean;
  routing?: string;
  _source?: NameList;
  _sourceExclude?: NameList;
  _sourceInclude?: NameList;
  version?: number;
  versionType?: VersionType;
  id: string;
  index: string;
  type: string;
}

export type NameList = string | string[] | boolean;
export type Refresh = boolean | 'true' | 'false' | 'wait_for' | '';
export type VersionType = 'internal' | 'external' | 'external_gte' | 'force';
export type ExpandWildcards = 'open' | 'closed' | 'none' | 'all';
export type DefaultOperator = 'AND' | 'OR';
export type Conflicts = 'abort' | 'proceed';

export interface GenericParams {
  requestTimeout?: number;
  maxRetries?: number;
  method?: string;
  body?: any;
  ignore?: number | number[];
  filterPath?: string | string[];
}

export interface DeleteDocumentResponse {
  found: boolean;
  _index: string;
  _type: string;
  _id: string;
  _version: number;
  result: string;
}

// FIXME: fix getTagsWithIds return type
export interface CMTagsAdapter {
  getTagsWithIds(req: FrameworkRequest, tagIds: string[]): any;
  upsertTag(req: FrameworkRequest, tag: BeatTag): Promise<{}>;
}

// FIXME: fix getBeatsWithIds return type
export interface CMBeatsAdapter {
  insert(beat: CMBeat): Promise<void>;
  update(beat: CMBeat): Promise<void>;
  get(id: string): any;
  getAll(req: FrameworkRequest): any;
  getWithIds(req: FrameworkRequest, beatIds: string[]): any;
  verifyBeats(req: FrameworkRequest, beatIds: string[]): any;
  removeTagsFromBeats(
    req: FrameworkRequest,
    removals: CMTagAssignment[]
  ): Promise<CMTagAssignment[]>;
  assignTagsToBeats(
    req: FrameworkRequest,
    assignments: CMTagAssignment[]
  ): Promise<CMTagAssignment[]>;
}

export interface CMTagAssignment {
  beatId: string;
  tag: string;
  idxInRequest?: number;
}

/**
 * The following are generic types, sharable between projects
 */

export interface BackendFrameworkAdapter {
  version: string;
  getSetting(settingPath: string): any;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerRoute<RouteRequest extends WrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
}

export interface FieldsResponse {
  [name: string]: FieldDef;
}

export interface FieldDetails {
  searchable: boolean;
  aggregatable: boolean;
  type: string;
}

export interface FieldDef {
  [type: string]: FieldDetails;
}

export interface FrameworkRequest<
  InternalRequest extends WrappableRequest = WrappableRequest
> {
  [internalFrameworkRequest]: InternalRequest;
  headers: InternalRequest['headers'];
  info: InternalRequest['info'];
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
}

export interface FrameworkRouteOptions<
  RouteRequest extends WrappableRequest,
  RouteResponse
> {
  path: string;
  method: string | string[];
  vhost?: string;
  handler: FrameworkRouteHandler<RouteRequest, RouteResponse>;
  config?: Pick<
    IRouteAdditionalConfigurationOptions,
    Exclude<keyof IRouteAdditionalConfigurationOptions, 'handler'>
  >;
}

export type FrameworkRouteHandler<
  RouteRequest extends WrappableRequest,
  RouteResponse
> = (
  request: FrameworkRequest<RouteRequest>,
  reply: IStrictReply<RouteResponse>
) => void;

export interface WrappableRequest<
  Payload = any,
  Params = any,
  Query = any,
  Headers = any,
  Info = any
> {
  headers: Headers;
  info: Info;
  payload: Payload;
  params: Params;
  query: Query;
}
