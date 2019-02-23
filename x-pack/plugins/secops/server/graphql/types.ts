/* tslint:disable */
/*
     * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
     * or more contributor license agreements. Licensed under the Elastic License;
     * you may not use this file except in compliance with the Elastic License.
     */

import { SecOpsContext } from '../lib/types';
import { GraphQLResolveInfo } from 'graphql';

export type Resolver<Result, Parent = any, Context = any, Args = never> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface ISubscriptionResolverObject<Result, Parent, Context, Args> {
  subscribe<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): AsyncIterator<R | Result>;
  resolve?<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): R | Result | Promise<R | Result>;
}

export type SubscriptionResolver<Result, Parent = any, Context = any, Args = never> =
  | ((...args: any[]) => ISubscriptionResolverObject<Result, Parent, Context, Args>)
  | ISubscriptionResolverObject<Result, Parent, Context, Args>;

// ====================================================
// START: Typescript template
// ====================================================

// ====================================================
// Types
// ====================================================

export interface Query {
  /** Get a security data source by id */
  source: Source;
  /** Get a list of all security data sources */
  allSources: Source[];
}

export interface Source {
  /** The id of the source */
  id: string;
  /** The raw configuration of the source */
  configuration: SourceConfiguration;
  /** The status of the source */
  status: SourceStatus;
  /** Gets Authentication success and failures based on a timerange */
  Authentications: AuthenticationsData;
  /** Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Events: EventsData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  NetworkTopNFlow: NetworkTopNFlowData;
  /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
  UncommonProcesses: UncommonProcessesData;
  /** Just a simple example to get the app name */
  whoAmI?: SayMyName | null;
}
/** A set of configuration options for a security data source */
export interface SourceConfiguration {
  /** The alias to read file data from */
  logAlias: string;
  /** The alias to read auditbeat data from */
  auditbeatAlias: string;
  /** The alias to read packetbeat data from */
  packetbeatAlias: string;
  /** The field mapping to use for this source */
  fields: SourceFields;
}
/** A mapping of semantic fields to their document counterparts */
export interface SourceFields {
  /** The field to identify a container by */
  container: string;
  /** The fields to identify a host by */
  host: string;
  /** The fields that may contain the log event message. The first field found win. */
  message: string[];
  /** The field to identify a pod by */
  pod: string;
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker: string;
  /** The field to use as a timestamp for metrics and logs */
  timestamp: string;
}
/** The status of an infrastructure data source */
export interface SourceStatus {
  /** Whether the configured auditbeat alias exists */
  auditbeatAliasExists: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
  auditbeatIndicesExist: boolean;
  /** The list of indices in the auditbeat alias */
  auditbeatIndices: string[];
  /** Whether the configured filebeat alias exists */
  filebeatAliasExists: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any filebeat indices */
  filebeatIndicesExist: boolean;
  /** The list of indices in the filebeat alias */
  filebeatIndices: string[];
  /** Whether the configured packetbeat alias exists */
  packetbeatAliasExists: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any packetbeat indices */
  packetbeatIndicesExist: boolean;
  /** The list of indices in the packetbeat alias */
  packetbeatIndices: string[];
  /** The list of fields defined in the index mappings */
  indexFields: IndexField[];
}
/** A descriptor of a field in an index */
export interface IndexField {
  /** The name of the field */
  name: string;
  /** The type of the field's values as recognized by Kibana */
  type: string;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
}

export interface AuthenticationsData {
  edges: AuthenticationsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface AuthenticationsEdges {
  node: AuthenticationItem;

  cursor: CursorType;
}

export interface AuthenticationItem {
  _id: string;

  failures: number;

  successes: number;

  user: UserEcsFields;

  lastSuccess?: LastSourceHost | null;

  lastFailure?: LastSourceHost | null;
}

export interface UserEcsFields {
  id?: number | null;

  name?: string | null;

  full_name?: string | null;

  email?: string | null;

  hash?: string | null;

  group?: string | null;
}

export interface LastSourceHost {
  timestamp?: string | null;

  source?: SourceEcsFields | null;

  host?: HostEcsFields | null;
}

export interface SourceEcsFields {
  ip?: string | null;

  port?: number | null;

  domain?: string[] | null;
}

export interface HostEcsFields {
  architecture?: string | null;

  id?: string | null;

  ip?: (string | null)[] | null;

  mac?: (string | null)[] | null;

  name?: string | null;

  os?: OsEcsFields | null;

  type?: string | null;
}

export interface OsEcsFields {
  platform?: string | null;

  name?: string | null;

  full?: string | null;

  family?: string | null;

  version?: string | null;

  kernel?: string | null;
}

export interface CursorType {
  value: string;

  tiebreaker?: string | null;
}

export interface PageInfo {
  endCursor?: CursorType | null;

  hasNextPage?: boolean | null;
}

export interface EventsData {
  kpiEventType?: KpiItem[] | null;

  edges: EcsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface KpiItem {
  value: string;

  count: number;
}

export interface EcsEdges {
  node: Ecs;

  cursor: CursorType;
}

export interface Ecs {
  _id: string;

  _index?: string | null;

  destination?: DestinationEcsFields | null;

  event?: EventEcsFields | null;

  geo?: GeoEcsFields | null;

  host?: HostEcsFields | null;

  source?: SourceEcsFields | null;

  suricata?: SuricataEcsFields | null;

  timestamp?: string | null;

  user?: UserEcsFields | null;
}

export interface DestinationEcsFields {
  ip?: string | null;

  port?: number | null;

  domain?: string[] | null;
}

export interface EventEcsFields {
  category?: string | null;

  duration?: number | null;

  id?: number | null;

  module?: string | null;

  severity?: number | null;

  action?: string | null;

  type?: string | null;
}

export interface GeoEcsFields {
  country_iso_code?: string | null;

  region_name?: string | null;
}

export interface SuricataEcsFields {
  eve?: SuricataEveData | null;
}

export interface SuricataEveData {
  alert?: SuricataAlertData | null;

  flow_id?: number | null;

  proto?: string | null;
}

export interface SuricataAlertData {
  signature?: string | null;

  signature_id?: number | null;
}

export interface HostsData {
  edges: HostsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface HostsEdges {
  node: HostItem;

  cursor: CursorType;
}

export interface HostItem {
  _id?: string | null;

  firstSeen?: string | null;

  host?: HostEcsFields | null;

  lastBeat?: string | null;
}

export interface NetworkTopNFlowData {
  edges: NetworkTopNFlowEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface NetworkTopNFlowEdges {
  node: NetworkTopNFlowItem;

  cursor: CursorType;
}

export interface NetworkTopNFlowItem {
  _id?: string | null;

  timestamp?: string | null;

  source?: TopNFlowItem | null;

  destination?: TopNFlowItem | null;

  client?: TopNFlowItem | null;

  server?: TopNFlowItem | null;

  network?: NetworkEcsField | null;
}

export interface TopNFlowItem {
  count?: number | null;

  domain?: string[] | null;

  ip?: string | null;
}

export interface NetworkEcsField {
  bytes?: number | null;

  packets?: number | null;

  direction?: NetworkDirectionEcs[] | null;
}

export interface UncommonProcessesData {
  edges: UncommonProcessesEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface UncommonProcessesEdges {
  node: UncommonProcessItem;

  cursor: CursorType;
}

export interface UncommonProcessItem {
  _id: string;

  instances: number;

  process: ProcessEcsFields;

  host: HostEcsFields[];

  user?: UserEcsFields | null;
}

export interface ProcessEcsFields {
  pid?: number | null;

  name?: string | null;

  ppid?: number | null;

  args?: (string | null)[] | null;

  executable?: string | null;

  title?: string | null;

  thread?: Thread | null;

  working_directory?: string | null;
}

export interface Thread {
  id?: number | null;

  start?: string | null;
}

export interface SayMyName {
  /** The id of the source */
  appName: string;
}

// ====================================================
// InputTypes
// ====================================================

export interface TimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: number;
  /** The beginning of the timerange */
  from: number;
}

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: string | null;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: string | null;
}

export interface SortField {
  sortFieldId?: string | null;

  direction?: Direction | null;
}

// ====================================================
// Arguments
// ====================================================

export interface SourceQueryArgs {
  /** The id of the source */
  id: string;
}
export interface AuthenticationsSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInput;

  filterQuery?: string | null;
}
export interface EventsSourceArgs {
  pagination: PaginationInput;

  sortField: SortField;

  timerange?: TimerangeInput | null;

  filterQuery?: string | null;
}
export interface HostsSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  pagination: PaginationInput;

  filterQuery?: string | null;
}
export interface NetworkTopNFlowSourceArgs {
  id?: string | null;

  direction: NetworkTopNFlowDirection;

  type: NetworkTopNFlowType;

  timerange: TimerangeInput;

  pagination: PaginationInput;

  filterQuery?: string | null;
}
export interface UncommonProcessesSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInput;

  filterQuery?: string | null;
}
export interface IndexFieldsSourceStatusArgs {
  indexTypes?: IndexType[] | null;
}

// ====================================================
// Enums
// ====================================================

export enum IndexType {
  ANY = 'ANY',
  FILEBEAT = 'FILEBEAT',
  AUDITBEAT = 'AUDITBEAT',
  PACKETBEAT = 'PACKETBEAT',
}

export enum Direction {
  ascending = 'ascending',
  descending = 'descending',
}

export enum NetworkTopNFlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}

export enum NetworkTopNFlowType {
  client = 'client',
  destination = 'destination',
  server = 'server',
  source = 'source',
}

export enum NetworkDirectionEcs {
  inbound = 'inbound',
  outbound = 'outbound',
  internal = 'internal',
  external = 'external',
  unknown = 'unknown',
}

// ====================================================
// END: Typescript template
// ====================================================

// ====================================================
// Resolvers
// ====================================================

export namespace QueryResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = never> {
    /** Get a security data source by id */
    source?: SourceResolver<Source, TypeParent, Context>;
    /** Get a list of all security data sources */
    allSources?: AllSourcesResolver<Source[], TypeParent, Context>;
  }

  export type SourceResolver<R = Source, Parent = never, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context,
    SourceArgs
  >;
  export interface SourceArgs {
    /** The id of the source */
    id: string;
  }

  export type AllSourcesResolver<R = Source[], Parent = never, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SourceResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = Source> {
    /** The id of the source */
    id?: IdResolver<string, TypeParent, Context>;
    /** The raw configuration of the source */
    configuration?: ConfigurationResolver<SourceConfiguration, TypeParent, Context>;
    /** The status of the source */
    status?: StatusResolver<SourceStatus, TypeParent, Context>;
    /** Gets Authentication success and failures based on a timerange */
    Authentications?: AuthenticationsResolver<AuthenticationsData, TypeParent, Context>;
    /** Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Events?: EventsResolver<EventsData, TypeParent, Context>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Hosts?: HostsResolver<HostsData, TypeParent, Context>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    NetworkTopNFlow?: NetworkTopNFlowResolver<NetworkTopNFlowData, TypeParent, Context>;
    /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
    UncommonProcesses?: UncommonProcessesResolver<UncommonProcessesData, TypeParent, Context>;
    /** Just a simple example to get the app name */
    whoAmI?: WhoAmIResolver<SayMyName | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = Source, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ConfigurationResolver<
    R = SourceConfiguration,
    Parent = Source,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type StatusResolver<R = SourceStatus, Parent = Source, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type AuthenticationsResolver<
    R = AuthenticationsData,
    Parent = Source,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context, AuthenticationsArgs>;
  export interface AuthenticationsArgs {
    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;
  }

  export type EventsResolver<R = EventsData, Parent = Source, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context,
    EventsArgs
  >;
  export interface EventsArgs {
    pagination: PaginationInput;

    sortField: SortField;

    timerange?: TimerangeInput | null;

    filterQuery?: string | null;
  }

  export type HostsResolver<R = HostsData, Parent = Source, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context,
    HostsArgs
  >;
  export interface HostsArgs {
    id?: string | null;

    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;
  }

  export type NetworkTopNFlowResolver<
    R = NetworkTopNFlowData,
    Parent = Source,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context, NetworkTopNFlowArgs>;
  export interface NetworkTopNFlowArgs {
    id?: string | null;

    direction: NetworkTopNFlowDirection;

    type: NetworkTopNFlowType;

    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;
  }

  export type UncommonProcessesResolver<
    R = UncommonProcessesData,
    Parent = Source,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context, UncommonProcessesArgs>;
  export interface UncommonProcessesArgs {
    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;
  }

  export type WhoAmIResolver<
    R = SayMyName | null,
    Parent = Source,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}
/** A set of configuration options for a security data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SourceConfiguration> {
    /** The alias to read file data from */
    logAlias?: LogAliasResolver<string, TypeParent, Context>;
    /** The alias to read auditbeat data from */
    auditbeatAlias?: AuditbeatAliasResolver<string, TypeParent, Context>;
    /** The alias to read packetbeat data from */
    packetbeatAlias?: PacketbeatAliasResolver<string, TypeParent, Context>;
    /** The field mapping to use for this source */
    fields?: FieldsResolver<SourceFields, TypeParent, Context>;
  }

  export type LogAliasResolver<
    R = string,
    Parent = SourceConfiguration,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatAliasResolver<
    R = string,
    Parent = SourceConfiguration,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatAliasResolver<
    R = string,
    Parent = SourceConfiguration,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FieldsResolver<
    R = SourceFields,
    Parent = SourceConfiguration,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SourceFields> {
    /** The field to identify a container by */
    container?: ContainerResolver<string, TypeParent, Context>;
    /** The fields to identify a host by */
    host?: HostResolver<string, TypeParent, Context>;
    /** The fields that may contain the log event message. The first field found win. */
    message?: MessageResolver<string[], TypeParent, Context>;
    /** The field to identify a pod by */
    pod?: PodResolver<string, TypeParent, Context>;
    /** The field to use as a tiebreaker for log events that have identical timestamps */
    tiebreaker?: TiebreakerResolver<string, TypeParent, Context>;
    /** The field to use as a timestamp for metrics and logs */
    timestamp?: TimestampResolver<string, TypeParent, Context>;
  }

  export type ContainerResolver<
    R = string,
    Parent = SourceFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<R = string, Parent = SourceFields, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MessageResolver<
    R = string[],
    Parent = SourceFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PodResolver<R = string, Parent = SourceFields, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TiebreakerResolver<
    R = string,
    Parent = SourceFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string,
    Parent = SourceFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}
/** The status of an infrastructure data source */
export namespace SourceStatusResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SourceStatus> {
    /** Whether the configured auditbeat alias exists */
    auditbeatAliasExists?: AuditbeatAliasExistsResolver<boolean, TypeParent, Context>;
    /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
    auditbeatIndicesExist?: AuditbeatIndicesExistResolver<boolean, TypeParent, Context>;
    /** The list of indices in the auditbeat alias */
    auditbeatIndices?: AuditbeatIndicesResolver<string[], TypeParent, Context>;
    /** Whether the configured filebeat alias exists */
    filebeatAliasExists?: FilebeatAliasExistsResolver<boolean, TypeParent, Context>;
    /** Whether the configured alias or wildcard pattern resolve to any filebeat indices */
    filebeatIndicesExist?: FilebeatIndicesExistResolver<boolean, TypeParent, Context>;
    /** The list of indices in the filebeat alias */
    filebeatIndices?: FilebeatIndicesResolver<string[], TypeParent, Context>;
    /** Whether the configured packetbeat alias exists */
    packetbeatAliasExists?: PacketbeatAliasExistsResolver<boolean, TypeParent, Context>;
    /** Whether the configured alias or wildcard pattern resolve to any packetbeat indices */
    packetbeatIndicesExist?: PacketbeatIndicesExistResolver<boolean, TypeParent, Context>;
    /** The list of indices in the packetbeat alias */
    packetbeatIndices?: PacketbeatIndicesResolver<string[], TypeParent, Context>;
    /** The list of fields defined in the index mappings */
    indexFields?: IndexFieldsResolver<IndexField[], TypeParent, Context>;
  }

  export type AuditbeatAliasExistsResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatIndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatIndicesResolver<
    R = string[],
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatAliasExistsResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatIndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatIndicesResolver<
    R = string[],
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatAliasExistsResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatIndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatIndicesResolver<
    R = string[],
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type IndexFieldsResolver<
    R = IndexField[],
    Parent = SourceStatus,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context, IndexFieldsArgs>;
  export interface IndexFieldsArgs {
    indexTypes?: IndexType[] | null;
  }
}
/** A descriptor of a field in an index */
export namespace IndexFieldResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = IndexField> {
    /** The name of the field */
    name?: NameResolver<string, TypeParent, Context>;
    /** The type of the field's values as recognized by Kibana */
    type?: TypeResolver<string, TypeParent, Context>;
    /** Whether the field's values can be efficiently searched for */
    searchable?: SearchableResolver<boolean, TypeParent, Context>;
    /** Whether the field's values can be aggregated */
    aggregatable?: AggregatableResolver<boolean, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = IndexField, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = IndexField, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SearchableResolver<
    R = boolean,
    Parent = IndexField,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type AggregatableResolver<
    R = boolean,
    Parent = IndexField,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationsDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = AuthenticationsData> {
    edges?: EdgesResolver<AuthenticationsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = AuthenticationsEdges[],
    Parent = AuthenticationsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = AuthenticationsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = AuthenticationsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationsEdgesResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = AuthenticationsEdges> {
    node?: NodeResolver<AuthenticationItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = AuthenticationItem,
    Parent = AuthenticationsEdges,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = AuthenticationsEdges,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationItemResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = AuthenticationItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    failures?: FailuresResolver<number, TypeParent, Context>;

    successes?: SuccessesResolver<number, TypeParent, Context>;

    user?: UserResolver<UserEcsFields, TypeParent, Context>;

    lastSuccess?: LastSuccessResolver<LastSourceHost | null, TypeParent, Context>;

    lastFailure?: LastFailureResolver<LastSourceHost | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = AuthenticationItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FailuresResolver<
    R = number,
    Parent = AuthenticationItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SuccessesResolver<
    R = number,
    Parent = AuthenticationItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields,
    Parent = AuthenticationItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type LastSuccessResolver<
    R = LastSourceHost | null,
    Parent = AuthenticationItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type LastFailureResolver<
    R = LastSourceHost | null,
    Parent = AuthenticationItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace UserEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = UserEcsFields> {
    id?: IdResolver<number | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    full_name?: FullNameResolver<string | null, TypeParent, Context>;

    email?: EmailResolver<string | null, TypeParent, Context>;

    hash?: HashResolver<string | null, TypeParent, Context>;

    group?: GroupResolver<string | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = number | null,
    Parent = UserEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FullNameResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type EmailResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HashResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type GroupResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace LastSourceHostResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = LastSourceHost> {
    timestamp?: TimestampResolver<string | null, TypeParent, Context>;

    source?: SourceResolver<SourceEcsFields | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;
  }

  export type TimestampResolver<
    R = string | null,
    Parent = LastSourceHost,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = SourceEcsFields | null,
    Parent = LastSourceHost,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = LastSourceHost,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace SourceEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SourceEcsFields> {
    ip?: IpResolver<string | null, TypeParent, Context>;

    port?: PortResolver<number | null, TypeParent, Context>;

    domain?: DomainResolver<string[] | null, TypeParent, Context>;
  }

  export type IpResolver<
    R = string | null,
    Parent = SourceEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PortResolver<
    R = number | null,
    Parent = SourceEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = string[] | null,
    Parent = SourceEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = HostEcsFields> {
    architecture?: ArchitectureResolver<string | null, TypeParent, Context>;

    id?: IdResolver<string | null, TypeParent, Context>;

    ip?: IpResolver<(string | null)[] | null, TypeParent, Context>;

    mac?: MacResolver<(string | null)[] | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    os?: OsResolver<OsEcsFields | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;
  }

  export type ArchitectureResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = (string | null)[] | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type MacResolver<
    R = (string | null)[] | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type OsResolver<
    R = OsEcsFields | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace OsEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = OsEcsFields> {
    platform?: PlatformResolver<string | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    full?: FullResolver<string | null, TypeParent, Context>;

    family?: FamilyResolver<string | null, TypeParent, Context>;

    version?: VersionResolver<string | null, TypeParent, Context>;

    kernel?: KernelResolver<string | null, TypeParent, Context>;
  }

  export type PlatformResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FullResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FamilyResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type KernelResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace CursorTypeResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = CursorType> {
    value?: ValueResolver<string, TypeParent, Context>;

    tiebreaker?: TiebreakerResolver<string | null, TypeParent, Context>;
  }

  export type ValueResolver<R = string, Parent = CursorType, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TiebreakerResolver<
    R = string | null,
    Parent = CursorType,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace PageInfoResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = PageInfo> {
    endCursor?: EndCursorResolver<CursorType | null, TypeParent, Context>;

    hasNextPage?: HasNextPageResolver<boolean | null, TypeParent, Context>;
  }

  export type EndCursorResolver<
    R = CursorType | null,
    Parent = PageInfo,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HasNextPageResolver<
    R = boolean | null,
    Parent = PageInfo,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace EventsDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = EventsData> {
    kpiEventType?: KpiEventTypeResolver<KpiItem[] | null, TypeParent, Context>;

    edges?: EdgesResolver<EcsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type KpiEventTypeResolver<
    R = KpiItem[] | null,
    Parent = EventsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type EdgesResolver<
    R = EcsEdges[],
    Parent = EventsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = EventsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = EventsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace KpiItemResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = KpiItem> {
    value?: ValueResolver<string, TypeParent, Context>;

    count?: CountResolver<number, TypeParent, Context>;
  }

  export type ValueResolver<R = string, Parent = KpiItem, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CountResolver<R = number, Parent = KpiItem, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EcsEdgesResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = EcsEdges> {
    node?: NodeResolver<Ecs, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = Ecs, Parent = EcsEdges, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<R = CursorType, Parent = EcsEdges, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EcsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = Ecs> {
    _id?: IdResolver<string, TypeParent, Context>;

    _index?: IndexResolver<string | null, TypeParent, Context>;

    destination?: DestinationResolver<DestinationEcsFields | null, TypeParent, Context>;

    event?: EventResolver<EventEcsFields | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;

    source?: SourceResolver<SourceEcsFields | null, TypeParent, Context>;

    suricata?: SuricataResolver<SuricataEcsFields | null, TypeParent, Context>;

    timestamp?: TimestampResolver<string | null, TypeParent, Context>;

    user?: UserResolver<UserEcsFields | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = Ecs, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IndexResolver<R = string | null, Parent = Ecs, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DestinationResolver<
    R = DestinationEcsFields | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type EventResolver<
    R = EventEcsFields | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<
    R = GeoEcsFields | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = SourceEcsFields | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SuricataResolver<
    R = SuricataEcsFields | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields | null,
    Parent = Ecs,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace DestinationEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = DestinationEcsFields> {
    ip?: IpResolver<string | null, TypeParent, Context>;

    port?: PortResolver<number | null, TypeParent, Context>;

    domain?: DomainResolver<string[] | null, TypeParent, Context>;
  }

  export type IpResolver<
    R = string | null,
    Parent = DestinationEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PortResolver<
    R = number | null,
    Parent = DestinationEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = string[] | null,
    Parent = DestinationEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace EventEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = EventEcsFields> {
    category?: CategoryResolver<string | null, TypeParent, Context>;

    duration?: DurationResolver<number | null, TypeParent, Context>;

    id?: IdResolver<number | null, TypeParent, Context>;

    module?: ModuleResolver<string | null, TypeParent, Context>;

    severity?: SeverityResolver<number | null, TypeParent, Context>;

    action?: ActionResolver<string | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;
  }

  export type CategoryResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type DurationResolver<
    R = number | null,
    Parent = EventEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = number | null,
    Parent = EventEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ModuleResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SeverityResolver<
    R = number | null,
    Parent = EventEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ActionResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace GeoEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = GeoEcsFields> {
    country_iso_code?: CountryIsoCodeResolver<string | null, TypeParent, Context>;

    region_name?: RegionNameResolver<string | null, TypeParent, Context>;
  }

  export type CountryIsoCodeResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type RegionNameResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SuricataEcsFields> {
    eve?: EveResolver<SuricataEveData | null, TypeParent, Context>;
  }

  export type EveResolver<
    R = SuricataEveData | null,
    Parent = SuricataEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataEveDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SuricataEveData> {
    alert?: AlertResolver<SuricataAlertData | null, TypeParent, Context>;

    flow_id?: FlowIdResolver<number | null, TypeParent, Context>;

    proto?: ProtoResolver<string | null, TypeParent, Context>;
  }

  export type AlertResolver<
    R = SuricataAlertData | null,
    Parent = SuricataEveData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FlowIdResolver<
    R = number | null,
    Parent = SuricataEveData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ProtoResolver<
    R = string | null,
    Parent = SuricataEveData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataAlertDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SuricataAlertData> {
    signature?: SignatureResolver<string | null, TypeParent, Context>;

    signature_id?: SignatureIdResolver<number | null, TypeParent, Context>;
  }

  export type SignatureResolver<
    R = string | null,
    Parent = SuricataAlertData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SignatureIdResolver<
    R = number | null,
    Parent = SuricataAlertData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostsDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = HostsData> {
    edges?: EdgesResolver<HostsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = HostsEdges[],
    Parent = HostsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = HostsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = HostsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostsEdgesResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = HostsEdges> {
    node?: NodeResolver<HostItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = HostItem, Parent = HostsEdges, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<
    R = CursorType,
    Parent = HostsEdges,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostItemResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = HostItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    firstSeen?: FirstSeenResolver<string | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;

    lastBeat?: LastBeatResolver<string | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = HostItem, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FirstSeenResolver<
    R = string | null,
    Parent = HostItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = HostItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type LastBeatResolver<
    R = string | null,
    Parent = HostItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = NetworkTopNFlowData> {
    edges?: EdgesResolver<NetworkTopNFlowEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = NetworkTopNFlowEdges[],
    Parent = NetworkTopNFlowData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkTopNFlowData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = NetworkTopNFlowData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowEdgesResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = NetworkTopNFlowEdges> {
    node?: NodeResolver<NetworkTopNFlowItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = NetworkTopNFlowItem,
    Parent = NetworkTopNFlowEdges,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkTopNFlowEdges,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowItemResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = NetworkTopNFlowItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    timestamp?: TimestampResolver<string | null, TypeParent, Context>;

    source?: SourceResolver<TopNFlowItem | null, TypeParent, Context>;

    destination?: DestinationResolver<TopNFlowItem | null, TypeParent, Context>;

    client?: ClientResolver<TopNFlowItem | null, TypeParent, Context>;

    server?: ServerResolver<TopNFlowItem | null, TypeParent, Context>;

    network?: NetworkResolver<NetworkEcsField | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string | null,
    Parent = NetworkTopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string | null,
    Parent = NetworkTopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ClientResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ServerResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type NetworkResolver<
    R = NetworkEcsField | null,
    Parent = NetworkTopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace TopNFlowItemResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = TopNFlowItem> {
    count?: CountResolver<number | null, TypeParent, Context>;

    domain?: DomainResolver<string[] | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;
  }

  export type CountResolver<
    R = number | null,
    Parent = TopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = string[] | null,
    Parent = TopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = TopNFlowItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkEcsFieldResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = NetworkEcsField> {
    bytes?: BytesResolver<number | null, TypeParent, Context>;

    packets?: PacketsResolver<number | null, TypeParent, Context>;

    direction?: DirectionResolver<NetworkDirectionEcs[] | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = number | null,
    Parent = NetworkEcsField,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = number | null,
    Parent = NetworkEcsField,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type DirectionResolver<
    R = NetworkDirectionEcs[] | null,
    Parent = NetworkEcsField,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessesDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = UncommonProcessesData> {
    edges?: EdgesResolver<UncommonProcessesEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = UncommonProcessesEdges[],
    Parent = UncommonProcessesData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = UncommonProcessesData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = UncommonProcessesData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessesEdgesResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = UncommonProcessesEdges> {
    node?: NodeResolver<UncommonProcessItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = UncommonProcessItem,
    Parent = UncommonProcessesEdges,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = UncommonProcessesEdges,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessItemResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = UncommonProcessItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    instances?: InstancesResolver<number, TypeParent, Context>;

    process?: ProcessResolver<ProcessEcsFields, TypeParent, Context>;

    host?: HostResolver<HostEcsFields[], TypeParent, Context>;

    user?: UserResolver<UserEcsFields | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type InstancesResolver<
    R = number,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ProcessResolver<
    R = ProcessEcsFields,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields[],
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields | null,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace ProcessEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = ProcessEcsFields> {
    pid?: PidResolver<number | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    ppid?: PpidResolver<number | null, TypeParent, Context>;

    args?: ArgsResolver<(string | null)[] | null, TypeParent, Context>;

    executable?: ExecutableResolver<string | null, TypeParent, Context>;

    title?: TitleResolver<string | null, TypeParent, Context>;

    thread?: ThreadResolver<Thread | null, TypeParent, Context>;

    working_directory?: WorkingDirectoryResolver<string | null, TypeParent, Context>;
  }

  export type PidResolver<
    R = number | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type PpidResolver<
    R = number | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ArgsResolver<
    R = (string | null)[] | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ExecutableResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TitleResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type ThreadResolver<
    R = Thread | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type WorkingDirectoryResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace ThreadResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = Thread> {
    id?: IdResolver<number | null, TypeParent, Context>;

    start?: StartResolver<string | null, TypeParent, Context>;
  }

  export type IdResolver<R = number | null, Parent = Thread, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type StartResolver<R = string | null, Parent = Thread, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SayMyNameResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SayMyName> {
    /** The id of the source */
    appName?: AppNameResolver<string, TypeParent, Context>;
  }

  export type AppNameResolver<R = string, Parent = SayMyName, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
}
