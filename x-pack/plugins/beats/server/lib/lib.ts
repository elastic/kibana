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
  verified_on: string;
  type: string;
  version: string;
  host_ip: string;
  host_name: string;
  ephemeral_id: string;
  local_configuration_yml: string;
  tags: string;
  central_configuration_yml: string;
  metadata: {};
}

export interface BeatTag {
  id: string;
  configuration_blocks: ConfigurationBlock[];
}

export interface EnrollmentToken {
  token: string | null;
  expires_on: string;
}

export interface CMTokensAdapter {
  deleteEnrollmentToken(enrollmentToken: string): Promise<void>;
  getEnrollmentToken(enrollmentToken: string): Promise<EnrollmentToken>;
  upsertTokens(req: FrameworkRequest, tokens: EnrollmentToken[]): Promise<void>;
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
  getVerifiedWithIds(req: FrameworkRequest, beatIds: string[]): any;
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
  getSetting(settingPath: string): string | number;
  exposeStaticDir(urlPath: string, dir: string): void;
  installIndexTemplate(name: string, template: {}): void;
  registerRoute<RouteRequest extends WrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
  callWithInternalUser(esMethod: string, options: {}): Promise<any>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: FrameworkRequest,
    method: 'search',
    options?: object
  ): Promise<DatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest(
    req: FrameworkRequest,
    method: 'fieldCaps',
    options?: object
  ): Promise<DatabaseFieldCapsResponse>;
  callWithRequest(
    req: FrameworkRequest,
    method: string,
    options?: object
  ): Promise<DatabaseSearchResponse>;
}

interface DatabaseFieldCapsResponse extends DatabaseResponse {
  fields: FieldsResponse;
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

interface DatabaseResponse {
  took: number;
  timeout: boolean;
}

interface DatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends DatabaseResponse {
  aggregations?: Aggregations;
  hits: {
    total: number;
    hits: Hit[];
  };
}
