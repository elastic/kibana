/* tslint:disable */
/*
     * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
     * or more contributor license agreements. Licensed under the Elastic License;
     * you may not use this file except in compliance with the Elastic License.
     */

import { SiemContext } from '../lib/types';
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
// Scalars
// ====================================================

export type Date = any;

export type ToStringArray = any;

export type EsValue = any;

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

  Timeline: TimelineData;

  TimelineDetails: TimelineDetailsData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;

  IpOverview?: IpOverviewData | null;

  Domains?: DomainsData | null;

  KpiNetwork?: KpiNetworkData | null;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  NetworkTopNFlow: NetworkTopNFlowData;

  NetworkDns: NetworkDnsData;

  OverviewNetwork?: OverviewNetworkData | null;

  OverviewHost?: OverviewHostData | null;
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
  /** Where the field belong */
  category: string;
  /** Example of field's value */
  example?: string | null;
  /** whether the field's belong to an alias index */
  indexes: (string | null)[];
  /** The name of the field */
  name: string;
  /** The type of the field's values as recognized by Kibana */
  type: string;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
  /** Description of the field */
  description?: string | null;
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
  timestamp?: Date | null;

  source?: SourceEcsFields | null;

  host?: HostEcsFields | null;
}

export interface SourceEcsFields {
  bytes?: number | null;

  ip?: string | null;

  port?: number | null;

  domain?: string[] | null;

  geo?: GeoEcsFields | null;

  packets?: number | null;
}

export interface GeoEcsFields {
  city_name?: string | null;

  continent_name?: string | null;

  country_iso_code?: string | null;

  country_name?: string | null;

  location?: Location | null;

  region_iso_code?: string | null;

  region_name?: string | null;
}

export interface Location {
  lon?: number | null;

  lat?: number | null;
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
  value?: string | null;

  count: number;
}

export interface EcsEdges {
  node: Ecs;

  cursor: CursorType;
}

export interface Ecs {
  _id: string;

  _index?: string | null;

  auditd?: AuditdEcsFields | null;

  destination?: DestinationEcsFields | null;

  event?: EventEcsFields | null;

  geo?: GeoEcsFields | null;

  host?: HostEcsFields | null;

  network?: NetworkEcsField | null;

  source?: SourceEcsFields | null;

  suricata?: SuricataEcsFields | null;

  tls?: TlsEcsFields | null;

  zeek?: ZeekEcsFields | null;

  http?: HttpEcsFields | null;

  url?: UrlEcsFields | null;

  timestamp?: Date | null;

  message?: string[] | null;

  user?: UserEcsFields | null;

  process?: ProcessEcsFields | null;

  file?: FileFields | null;
}

export interface AuditdEcsFields {
  result?: string | null;

  session?: string | null;

  data?: AuditdData | null;

  summary?: Summary | null;

  sequence?: number | null;
}

export interface AuditdData {
  acct?: string | null;

  terminal?: string | null;

  op?: string | null;
}

export interface Summary {
  actor?: PrimarySecondary | null;

  object?: PrimarySecondary | null;

  how?: string | null;

  message_type?: string | null;

  sequence?: number | null;
}

export interface PrimarySecondary {
  primary?: string | null;

  secondary?: string | null;

  type?: string | null;
}

export interface DestinationEcsFields {
  bytes?: number | null;

  ip?: string | null;

  port?: number | null;

  domain?: string[] | null;

  geo?: GeoEcsFields | null;

  packets?: number | null;
}

export interface EventEcsFields {
  category?: string | null;

  duration?: number | null;

  id?: number | null;

  module?: string | null;

  severity?: number | null;

  start?: Date | null;

  end?: Date | null;

  action?: string | null;

  type?: string | null;

  dataset?: string | null;
}

export interface NetworkEcsField {
  bytes?: number | null;

  community_id?: string | null;

  direction?: string | null;

  packets?: number | null;

  protocol?: string | null;

  transport?: string | null;
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

export interface TlsEcsFields {
  client_certificate?: TlsClientCertificateData | null;

  fingerprints?: TlsFingerprintsData | null;

  server_certificate?: TlsServerCertificateData | null;
}

export interface TlsClientCertificateData {
  fingerprint?: FingerprintData | null;
}

export interface FingerprintData {
  sha1?: string | null;
}

export interface TlsFingerprintsData {
  ja3?: TlsJa3Data | null;
}

export interface TlsJa3Data {
  hash?: string | null;
}

export interface TlsServerCertificateData {
  fingerprint?: FingerprintData | null;
}

export interface ZeekEcsFields {
  session_id?: string | null;

  connection?: ZeekConnectionData | null;

  notice?: ZeekNoticeData | null;

  dns?: ZeekDnsData | null;

  http?: ZeekHttpData | null;

  files?: ZeekFileData | null;

  ssl?: ZeekSslData | null;
}

export interface ZeekConnectionData {
  local_resp?: string | null;

  local_orig?: string | null;

  missed_bytes?: number | null;

  state?: string | null;

  history?: string | null;
}

export interface ZeekNoticeData {
  suppress_for?: number | null;

  msg?: string | null;

  note?: string | null;

  sub?: string | null;

  dst?: string | null;

  dropped?: boolean | null;

  peer_descr?: string | null;
}

export interface ZeekDnsData {
  AA?: boolean | null;

  qclass_name?: string | null;

  RD?: boolean | null;

  qtype_name?: string | null;

  rejected?: boolean | null;

  qtype?: number | null;

  query?: string | null;

  trans_id?: number | null;

  qclass?: number | null;

  RA?: boolean | null;

  TC?: boolean | null;
}

export interface ZeekHttpData {
  resp_mime_types?: string[] | null;

  trans_depth?: string | null;

  status_msg?: string | null;

  resp_fuids?: string[] | null;

  tags?: string[] | null;
}

export interface ZeekFileData {
  session_ids?: string[] | null;

  timedout?: boolean | null;

  local_orig?: boolean | null;

  tx_host?: string | null;

  source?: string | null;

  is_orig?: boolean | null;

  overflow_bytes?: number | null;

  sha1?: string | null;

  duration?: number | null;

  depth?: number | null;

  analyzers?: string[] | null;

  mime_type?: string | null;

  rx_host?: string | null;

  total_bytes?: number | null;

  fuid?: string | null;

  seen_bytes?: number | null;

  missing_bytes?: number | null;

  md5?: string | null;
}

export interface ZeekSslData {
  cipher?: string | null;

  established?: boolean | null;

  resumed?: boolean | null;

  version?: string | null;
}

export interface HttpEcsFields {
  version?: string | null;

  request?: HttpRequestData | null;

  response?: HttpResponseData | null;
}

export interface HttpRequestData {
  method?: string | null;

  body?: HttpBodyData | null;

  referrer?: string | null;

  bytes?: number | null;
}

export interface HttpBodyData {
  content?: string | null;

  bytes?: number | null;
}

export interface HttpResponseData {
  status_code?: number | null;

  body?: HttpBodyData | null;

  bytes?: number | null;
}

export interface UrlEcsFields {
  domain?: string | null;

  original?: string | null;

  username?: string | null;

  password?: string | null;
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

export interface FileFields {
  path?: string | null;

  target_path?: string | null;

  extension?: string | null;

  type?: string | null;

  device?: string | null;

  inode?: string | null;

  uid?: string | null;

  owner?: string | null;

  gid?: string | null;

  group?: string | null;

  mode?: string | null;

  size?: number | null;

  mtime?: Date | null;

  ctime?: Date | null;
}

export interface TimelineData {
  edges: TimelineEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface TimelineEdges {
  node: TimelineItem;

  cursor: CursorType;
}

export interface TimelineItem {
  _id: string;

  _index?: string | null;

  data: TimelineNonEcsData[];

  ecs: Ecs;
}

export interface TimelineNonEcsData {
  field: string;

  value?: ToStringArray | null;
}

export interface TimelineDetailsData {
  data?: DetailItem[] | null;
}

export interface DetailItem {
  category: string;

  description?: string | null;

  example?: string | null;

  field: string;

  type: string;

  values?: ToStringArray | null;

  originalValue?: EsValue | null;
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

  firstSeen?: Date | null;

  host?: HostEcsFields | null;

  lastBeat?: Date | null;
}

export interface IpOverviewData {
  source?: Overview | null;

  destination?: Overview | null;
}

export interface Overview {
  firstSeen?: Date | null;

  lastSeen?: Date | null;

  autonomousSystem: AutonomousSystem;

  host: HostEcsFields;

  geo: GeoEcsFields;
}

export interface AutonomousSystem {
  as_org?: string | null;

  asn?: string | null;

  ip?: string | null;
}

export interface DomainsData {
  domain_name?: string | null;
}

export interface KpiNetworkData {
  networkEvents?: number | null;

  uniqueFlowId?: number | null;

  activeAgents?: number | null;

  uniqueSourcePrivateIps?: number | null;

  uniqueDestinationPrivateIps?: number | null;

  dnsQueries?: number | null;

  tlsHandshakes?: number | null;
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

  timestamp?: Date | null;

  source?: TopNFlowItem | null;

  destination?: TopNFlowItem | null;

  client?: TopNFlowItem | null;

  server?: TopNFlowItem | null;

  network?: TopNFlowNetworkEcsField | null;
}

export interface TopNFlowItem {
  count?: number | null;

  domain?: string[] | null;

  ip?: string | null;
}

export interface TopNFlowNetworkEcsField {
  bytes?: number | null;

  packets?: number | null;

  transport?: string | null;

  direction?: NetworkDirectionEcs[] | null;
}

export interface NetworkDnsData {
  edges: NetworkDnsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface NetworkDnsEdges {
  node: NetworkDnsItem;

  cursor: CursorType;
}

export interface NetworkDnsItem {
  _id?: string | null;

  dnsBytesIn?: number | null;

  dnsBytesOut?: number | null;

  dnsName?: string | null;

  queryCount?: number | null;

  timestamp?: Date | null;

  uniqueDomains?: number | null;
}

export interface OverviewNetworkData {
  packetbeatFlow: number;

  packetbeatDNS: number;

  filebeatSuricata: number;

  filebeatZeek?: number | null;

  auditbeatSocket?: number | null;
}

export interface OverviewHostData {
  auditbeatAuditd: number;

  auditbeatFIM: number;

  auditbeatLogin: number;

  auditbeatPackage?: number | null;

  auditbeatProcess?: number | null;

  auditbeatUser?: number | null;
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
  sortFieldId: string;

  direction: Direction;
}

export interface NetworkTopNFlowSortField {
  field: NetworkTopNFlowFields;

  direction: Direction;
}

export interface NetworkDnsSortField {
  field: NetworkDnsFields;

  direction: Direction;
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
export interface TimelineSourceArgs {
  pagination: PaginationInput;

  sortField: SortField;

  fieldRequested: string[];

  timerange?: TimerangeInput | null;

  filterQuery?: string | null;
}
export interface TimelineDetailsSourceArgs {
  eventId: string;

  indexName: string;
}
export interface HostsSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  pagination: PaginationInput;

  filterQuery?: string | null;
}
export interface IpOverviewSourceArgs {
  id?: string | null;

  filterQuery?: string | null;

  ip: string;
}
export interface DomainsSourceArgs {
  id?: string | null;

  filterQuery?: string | null;

  ip: string;
}
export interface KpiNetworkSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;
}
export interface NetworkTopNFlowSourceArgs {
  direction: NetworkTopNFlowDirection;

  filterQuery?: string | null;

  id?: string | null;

  pagination: PaginationInput;

  sort: NetworkTopNFlowSortField;

  type: NetworkTopNFlowType;

  timerange: TimerangeInput;
}
export interface NetworkDnsSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  isPtrIncluded: boolean;

  pagination: PaginationInput;

  sort: NetworkDnsSortField;

  timerange: TimerangeInput;
}
export interface OverviewNetworkSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;
}
export interface OverviewHostSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

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
  asc = 'asc',
  desc = 'desc',
}

export enum NetworkTopNFlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}

export enum NetworkTopNFlowFields {
  bytes = 'bytes',
  packets = 'packets',
  ipCount = 'ipCount',
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
  incoming = 'incoming',
  outgoing = 'outgoing',
  listening = 'listening',
  unknown = 'unknown',
}

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut',
}

export enum IpOverviewType {
  destination = 'destination',
  source = 'source',
}

// ====================================================
// END: Typescript template
// ====================================================

// ====================================================
// Resolvers
// ====================================================

export namespace QueryResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = never> {
    /** Get a security data source by id */
    source?: SourceResolver<Source, TypeParent, Context>;
    /** Get a list of all security data sources */
    allSources?: AllSourcesResolver<Source[], TypeParent, Context>;
  }

  export type SourceResolver<R = Source, Parent = never, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    SourceArgs
  >;
  export interface SourceArgs {
    /** The id of the source */
    id: string;
  }

  export type AllSourcesResolver<R = Source[], Parent = never, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SourceResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Source> {
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

    Timeline?: TimelineResolver<TimelineData, TypeParent, Context>;

    TimelineDetails?: TimelineDetailsResolver<TimelineDetailsData, TypeParent, Context>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Hosts?: HostsResolver<HostsData, TypeParent, Context>;

    IpOverview?: IpOverviewResolver<IpOverviewData | null, TypeParent, Context>;

    Domains?: DomainsResolver<DomainsData | null, TypeParent, Context>;

    KpiNetwork?: KpiNetworkResolver<KpiNetworkData | null, TypeParent, Context>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    NetworkTopNFlow?: NetworkTopNFlowResolver<NetworkTopNFlowData, TypeParent, Context>;

    NetworkDns?: NetworkDnsResolver<NetworkDnsData, TypeParent, Context>;

    OverviewNetwork?: OverviewNetworkResolver<OverviewNetworkData | null, TypeParent, Context>;

    OverviewHost?: OverviewHostResolver<OverviewHostData | null, TypeParent, Context>;
    /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
    UncommonProcesses?: UncommonProcessesResolver<UncommonProcessesData, TypeParent, Context>;
    /** Just a simple example to get the app name */
    whoAmI?: WhoAmIResolver<SayMyName | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ConfigurationResolver<
    R = SourceConfiguration,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StatusResolver<R = SourceStatus, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type AuthenticationsResolver<
    R = AuthenticationsData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, AuthenticationsArgs>;
  export interface AuthenticationsArgs {
    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;
  }

  export type EventsResolver<R = EventsData, Parent = Source, Context = SiemContext> = Resolver<
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

  export type TimelineResolver<R = TimelineData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    TimelineArgs
  >;
  export interface TimelineArgs {
    pagination: PaginationInput;

    sortField: SortField;

    fieldRequested: string[];

    timerange?: TimerangeInput | null;

    filterQuery?: string | null;
  }

  export type TimelineDetailsResolver<
    R = TimelineDetailsData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, TimelineDetailsArgs>;
  export interface TimelineDetailsArgs {
    eventId: string;

    indexName: string;
  }

  export type HostsResolver<R = HostsData, Parent = Source, Context = SiemContext> = Resolver<
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

  export type IpOverviewResolver<
    R = IpOverviewData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, IpOverviewArgs>;
  export interface IpOverviewArgs {
    id?: string | null;

    filterQuery?: string | null;

    ip: string;
  }

  export type DomainsResolver<
    R = DomainsData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, DomainsArgs>;
  export interface DomainsArgs {
    id?: string | null;

    filterQuery?: string | null;

    ip: string;
  }

  export type KpiNetworkResolver<
    R = KpiNetworkData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, KpiNetworkArgs>;
  export interface KpiNetworkArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;
  }

  export type NetworkTopNFlowResolver<
    R = NetworkTopNFlowData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, NetworkTopNFlowArgs>;
  export interface NetworkTopNFlowArgs {
    direction: NetworkTopNFlowDirection;

    filterQuery?: string | null;

    id?: string | null;

    pagination: PaginationInput;

    sort: NetworkTopNFlowSortField;

    type: NetworkTopNFlowType;

    timerange: TimerangeInput;
  }

  export type NetworkDnsResolver<
    R = NetworkDnsData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, NetworkDnsArgs>;
  export interface NetworkDnsArgs {
    filterQuery?: string | null;

    id?: string | null;

    isPtrIncluded: boolean;

    pagination: PaginationInput;

    sort: NetworkDnsSortField;

    timerange: TimerangeInput;
  }

  export type OverviewNetworkResolver<
    R = OverviewNetworkData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, OverviewNetworkArgs>;
  export interface OverviewNetworkArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;
  }

  export type OverviewHostResolver<
    R = OverviewHostData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, OverviewHostArgs>;
  export interface OverviewHostArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;
  }

  export type UncommonProcessesResolver<
    R = UncommonProcessesData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, UncommonProcessesArgs>;
  export interface UncommonProcessesArgs {
    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;
  }

  export type WhoAmIResolver<
    R = SayMyName | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}
/** A set of configuration options for a security data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceConfiguration> {
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
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatAliasResolver<
    R = string,
    Parent = SourceConfiguration,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatAliasResolver<
    R = string,
    Parent = SourceConfiguration,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FieldsResolver<
    R = SourceFields,
    Parent = SourceConfiguration,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceFields> {
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
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<R = string, Parent = SourceFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MessageResolver<
    R = string[],
    Parent = SourceFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PodResolver<R = string, Parent = SourceFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TiebreakerResolver<
    R = string,
    Parent = SourceFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string,
    Parent = SourceFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}
/** The status of an infrastructure data source */
export namespace SourceStatusResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceStatus> {
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
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatIndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatIndicesResolver<
    R = string[],
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatAliasExistsResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatIndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatIndicesResolver<
    R = string[],
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatAliasExistsResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatIndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatIndicesResolver<
    R = string[],
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IndexFieldsResolver<
    R = IndexField[],
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context, IndexFieldsArgs>;
  export interface IndexFieldsArgs {
    indexTypes?: IndexType[] | null;
  }
}
/** A descriptor of a field in an index */
export namespace IndexFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = IndexField> {
    /** Where the field belong */
    category?: CategoryResolver<string, TypeParent, Context>;
    /** Example of field's value */
    example?: ExampleResolver<string | null, TypeParent, Context>;
    /** whether the field's belong to an alias index */
    indexes?: IndexesResolver<(string | null)[], TypeParent, Context>;
    /** The name of the field */
    name?: NameResolver<string, TypeParent, Context>;
    /** The type of the field's values as recognized by Kibana */
    type?: TypeResolver<string, TypeParent, Context>;
    /** Whether the field's values can be efficiently searched for */
    searchable?: SearchableResolver<boolean, TypeParent, Context>;
    /** Whether the field's values can be aggregated */
    aggregatable?: AggregatableResolver<boolean, TypeParent, Context>;
    /** Description of the field */
    description?: DescriptionResolver<string | null, TypeParent, Context>;
  }

  export type CategoryResolver<R = string, Parent = IndexField, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ExampleResolver<
    R = string | null,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IndexesResolver<
    R = (string | null)[],
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<R = string, Parent = IndexField, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = IndexField, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SearchableResolver<
    R = boolean,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AggregatableResolver<
    R = boolean,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuthenticationsData> {
    edges?: EdgesResolver<AuthenticationsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = AuthenticationsEdges[],
    Parent = AuthenticationsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = AuthenticationsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = AuthenticationsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuthenticationsEdges> {
    node?: NodeResolver<AuthenticationItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = AuthenticationItem,
    Parent = AuthenticationsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = AuthenticationsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuthenticationItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    failures?: FailuresResolver<number, TypeParent, Context>;

    successes?: SuccessesResolver<number, TypeParent, Context>;

    user?: UserResolver<UserEcsFields, TypeParent, Context>;

    lastSuccess?: LastSuccessResolver<LastSourceHost | null, TypeParent, Context>;

    lastFailure?: LastFailureResolver<LastSourceHost | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = AuthenticationItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FailuresResolver<
    R = number,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SuccessesResolver<
    R = number,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastSuccessResolver<
    R = LastSourceHost | null,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastFailureResolver<
    R = LastSourceHost | null,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UserEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UserEcsFields> {
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
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FullNameResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EmailResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HashResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GroupResolver<
    R = string | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace LastSourceHostResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = LastSourceHost> {
    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    source?: SourceResolver<SourceEcsFields | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;
  }

  export type TimestampResolver<
    R = Date | null,
    Parent = LastSourceHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = SourceEcsFields | null,
    Parent = LastSourceHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = LastSourceHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SourceEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceEcsFields> {
    bytes?: BytesResolver<number | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;

    port?: PortResolver<number | null, TypeParent, Context>;

    domain?: DomainResolver<string[] | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    packets?: PacketsResolver<number | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = number | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PortResolver<
    R = number | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = string[] | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<
    R = GeoEcsFields | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = number | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace GeoEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = GeoEcsFields> {
    city_name?: CityNameResolver<string | null, TypeParent, Context>;

    continent_name?: ContinentNameResolver<string | null, TypeParent, Context>;

    country_iso_code?: CountryIsoCodeResolver<string | null, TypeParent, Context>;

    country_name?: CountryNameResolver<string | null, TypeParent, Context>;

    location?: LocationResolver<Location | null, TypeParent, Context>;

    region_iso_code?: RegionIsoCodeResolver<string | null, TypeParent, Context>;

    region_name?: RegionNameResolver<string | null, TypeParent, Context>;
  }

  export type CityNameResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ContinentNameResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CountryIsoCodeResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CountryNameResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LocationResolver<
    R = Location | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RegionIsoCodeResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RegionNameResolver<
    R = string | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace LocationResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Location> {
    lon?: LonResolver<number | null, TypeParent, Context>;

    lat?: LatResolver<number | null, TypeParent, Context>;
  }

  export type LonResolver<R = number | null, Parent = Location, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type LatResolver<R = number | null, Parent = Location, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace HostEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostEcsFields> {
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
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = (string | null)[] | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MacResolver<
    R = (string | null)[] | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OsResolver<
    R = OsEcsFields | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OsEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = OsEcsFields> {
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
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FullResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FamilyResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type KernelResolver<
    R = string | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace CursorTypeResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = CursorType> {
    value?: ValueResolver<string, TypeParent, Context>;

    tiebreaker?: TiebreakerResolver<string | null, TypeParent, Context>;
  }

  export type ValueResolver<R = string, Parent = CursorType, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TiebreakerResolver<
    R = string | null,
    Parent = CursorType,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace PageInfoResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = PageInfo> {
    endCursor?: EndCursorResolver<CursorType | null, TypeParent, Context>;

    hasNextPage?: HasNextPageResolver<boolean | null, TypeParent, Context>;
  }

  export type EndCursorResolver<
    R = CursorType | null,
    Parent = PageInfo,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HasNextPageResolver<
    R = boolean | null,
    Parent = PageInfo,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace EventsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = EventsData> {
    kpiEventType?: KpiEventTypeResolver<KpiItem[] | null, TypeParent, Context>;

    edges?: EdgesResolver<EcsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type KpiEventTypeResolver<
    R = KpiItem[] | null,
    Parent = EventsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EdgesResolver<R = EcsEdges[], Parent = EventsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TotalCountResolver<R = number, Parent = EventsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PageInfoResolver<R = PageInfo, Parent = EventsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace KpiItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KpiItem> {
    value?: ValueResolver<string | null, TypeParent, Context>;

    count?: CountResolver<number, TypeParent, Context>;
  }

  export type ValueResolver<R = string | null, Parent = KpiItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CountResolver<R = number, Parent = KpiItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EcsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = EcsEdges> {
    node?: NodeResolver<Ecs, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = Ecs, Parent = EcsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<R = CursorType, Parent = EcsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EcsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Ecs> {
    _id?: IdResolver<string, TypeParent, Context>;

    _index?: IndexResolver<string | null, TypeParent, Context>;

    auditd?: AuditdResolver<AuditdEcsFields | null, TypeParent, Context>;

    destination?: DestinationResolver<DestinationEcsFields | null, TypeParent, Context>;

    event?: EventResolver<EventEcsFields | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;

    network?: NetworkResolver<NetworkEcsField | null, TypeParent, Context>;

    source?: SourceResolver<SourceEcsFields | null, TypeParent, Context>;

    suricata?: SuricataResolver<SuricataEcsFields | null, TypeParent, Context>;

    tls?: TlsResolver<TlsEcsFields | null, TypeParent, Context>;

    zeek?: ZeekResolver<ZeekEcsFields | null, TypeParent, Context>;

    http?: HttpResolver<HttpEcsFields | null, TypeParent, Context>;

    url?: UrlResolver<UrlEcsFields | null, TypeParent, Context>;

    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    message?: MessageResolver<string[] | null, TypeParent, Context>;

    user?: UserResolver<UserEcsFields | null, TypeParent, Context>;

    process?: ProcessResolver<ProcessEcsFields | null, TypeParent, Context>;

    file?: FileResolver<FileFields | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IndexResolver<R = string | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type AuditdResolver<
    R = AuditdEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = DestinationEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EventResolver<
    R = EventEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<R = GeoEcsFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NetworkResolver<
    R = NetworkEcsField | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = SourceEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SuricataResolver<
    R = SuricataEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TlsResolver<R = TlsEcsFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ZeekResolver<
    R = ZeekEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HttpResolver<
    R = HttpEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UrlResolver<R = UrlEcsFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TimestampResolver<R = Date | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MessageResolver<R = string[] | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type UserResolver<
    R = UserEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProcessResolver<
    R = ProcessEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FileResolver<R = FileFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace AuditdEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuditdEcsFields> {
    result?: ResultResolver<string | null, TypeParent, Context>;

    session?: SessionResolver<string | null, TypeParent, Context>;

    data?: DataResolver<AuditdData | null, TypeParent, Context>;

    summary?: SummaryResolver<Summary | null, TypeParent, Context>;

    sequence?: SequenceResolver<number | null, TypeParent, Context>;
  }

  export type ResultResolver<
    R = string | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SessionResolver<
    R = string | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DataResolver<
    R = AuditdData | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SummaryResolver<
    R = Summary | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SequenceResolver<
    R = number | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuditdDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuditdData> {
    acct?: AcctResolver<string | null, TypeParent, Context>;

    terminal?: TerminalResolver<string | null, TypeParent, Context>;

    op?: OpResolver<string | null, TypeParent, Context>;
  }

  export type AcctResolver<
    R = string | null,
    Parent = AuditdData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TerminalResolver<
    R = string | null,
    Parent = AuditdData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OpResolver<R = string | null, Parent = AuditdData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SummaryResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Summary> {
    actor?: ActorResolver<PrimarySecondary | null, TypeParent, Context>;

    object?: ObjectResolver<PrimarySecondary | null, TypeParent, Context>;

    how?: HowResolver<string | null, TypeParent, Context>;

    message_type?: MessageTypeResolver<string | null, TypeParent, Context>;

    sequence?: SequenceResolver<number | null, TypeParent, Context>;
  }

  export type ActorResolver<
    R = PrimarySecondary | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ObjectResolver<
    R = PrimarySecondary | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HowResolver<R = string | null, Parent = Summary, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MessageTypeResolver<
    R = string | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SequenceResolver<
    R = number | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace PrimarySecondaryResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = PrimarySecondary> {
    primary?: PrimaryResolver<string | null, TypeParent, Context>;

    secondary?: SecondaryResolver<string | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;
  }

  export type PrimaryResolver<
    R = string | null,
    Parent = PrimarySecondary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SecondaryResolver<
    R = string | null,
    Parent = PrimarySecondary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = PrimarySecondary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DestinationEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DestinationEcsFields> {
    bytes?: BytesResolver<number | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;

    port?: PortResolver<number | null, TypeParent, Context>;

    domain?: DomainResolver<string[] | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    packets?: PacketsResolver<number | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = number | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PortResolver<
    R = number | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = string[] | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<
    R = GeoEcsFields | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = number | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace EventEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = EventEcsFields> {
    category?: CategoryResolver<string | null, TypeParent, Context>;

    duration?: DurationResolver<number | null, TypeParent, Context>;

    id?: IdResolver<number | null, TypeParent, Context>;

    module?: ModuleResolver<string | null, TypeParent, Context>;

    severity?: SeverityResolver<number | null, TypeParent, Context>;

    start?: StartResolver<Date | null, TypeParent, Context>;

    end?: EndResolver<Date | null, TypeParent, Context>;

    action?: ActionResolver<string | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;

    dataset?: DatasetResolver<string | null, TypeParent, Context>;
  }

  export type CategoryResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DurationResolver<
    R = number | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = number | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ModuleResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SeverityResolver<
    R = number | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StartResolver<
    R = Date | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EndResolver<
    R = Date | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ActionResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DatasetResolver<
    R = string | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkEcsFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkEcsField> {
    bytes?: BytesResolver<number | null, TypeParent, Context>;

    community_id?: CommunityIdResolver<string | null, TypeParent, Context>;

    direction?: DirectionResolver<string | null, TypeParent, Context>;

    packets?: PacketsResolver<number | null, TypeParent, Context>;

    protocol?: ProtocolResolver<string | null, TypeParent, Context>;

    transport?: TransportResolver<string | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = number | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CommunityIdResolver<
    R = string | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DirectionResolver<
    R = string | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = number | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProtocolResolver<
    R = string | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransportResolver<
    R = string | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SuricataEcsFields> {
    eve?: EveResolver<SuricataEveData | null, TypeParent, Context>;
  }

  export type EveResolver<
    R = SuricataEveData | null,
    Parent = SuricataEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataEveDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SuricataEveData> {
    alert?: AlertResolver<SuricataAlertData | null, TypeParent, Context>;

    flow_id?: FlowIdResolver<number | null, TypeParent, Context>;

    proto?: ProtoResolver<string | null, TypeParent, Context>;
  }

  export type AlertResolver<
    R = SuricataAlertData | null,
    Parent = SuricataEveData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FlowIdResolver<
    R = number | null,
    Parent = SuricataEveData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProtoResolver<
    R = string | null,
    Parent = SuricataEveData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataAlertDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SuricataAlertData> {
    signature?: SignatureResolver<string | null, TypeParent, Context>;

    signature_id?: SignatureIdResolver<number | null, TypeParent, Context>;
  }

  export type SignatureResolver<
    R = string | null,
    Parent = SuricataAlertData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SignatureIdResolver<
    R = number | null,
    Parent = SuricataAlertData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsEcsFields> {
    client_certificate?: ClientCertificateResolver<
      TlsClientCertificateData | null,
      TypeParent,
      Context
    >;

    fingerprints?: FingerprintsResolver<TlsFingerprintsData | null, TypeParent, Context>;

    server_certificate?: ServerCertificateResolver<
      TlsServerCertificateData | null,
      TypeParent,
      Context
    >;
  }

  export type ClientCertificateResolver<
    R = TlsClientCertificateData | null,
    Parent = TlsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FingerprintsResolver<
    R = TlsFingerprintsData | null,
    Parent = TlsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ServerCertificateResolver<
    R = TlsServerCertificateData | null,
    Parent = TlsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsClientCertificateDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsClientCertificateData> {
    fingerprint?: FingerprintResolver<FingerprintData | null, TypeParent, Context>;
  }

  export type FingerprintResolver<
    R = FingerprintData | null,
    Parent = TlsClientCertificateData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace FingerprintDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = FingerprintData> {
    sha1?: Sha1Resolver<string | null, TypeParent, Context>;
  }

  export type Sha1Resolver<
    R = string | null,
    Parent = FingerprintData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsFingerprintsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsFingerprintsData> {
    ja3?: Ja3Resolver<TlsJa3Data | null, TypeParent, Context>;
  }

  export type Ja3Resolver<
    R = TlsJa3Data | null,
    Parent = TlsFingerprintsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsJa3DataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsJa3Data> {
    hash?: HashResolver<string | null, TypeParent, Context>;
  }

  export type HashResolver<
    R = string | null,
    Parent = TlsJa3Data,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsServerCertificateDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsServerCertificateData> {
    fingerprint?: FingerprintResolver<FingerprintData | null, TypeParent, Context>;
  }

  export type FingerprintResolver<
    R = FingerprintData | null,
    Parent = TlsServerCertificateData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekEcsFields> {
    session_id?: SessionIdResolver<string | null, TypeParent, Context>;

    connection?: ConnectionResolver<ZeekConnectionData | null, TypeParent, Context>;

    notice?: NoticeResolver<ZeekNoticeData | null, TypeParent, Context>;

    dns?: DnsResolver<ZeekDnsData | null, TypeParent, Context>;

    http?: HttpResolver<ZeekHttpData | null, TypeParent, Context>;

    files?: FilesResolver<ZeekFileData | null, TypeParent, Context>;

    ssl?: SslResolver<ZeekSslData | null, TypeParent, Context>;
  }

  export type SessionIdResolver<
    R = string | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ConnectionResolver<
    R = ZeekConnectionData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoticeResolver<
    R = ZeekNoticeData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsResolver<
    R = ZeekDnsData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HttpResolver<
    R = ZeekHttpData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilesResolver<
    R = ZeekFileData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SslResolver<
    R = ZeekSslData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekConnectionDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekConnectionData> {
    local_resp?: LocalRespResolver<string | null, TypeParent, Context>;

    local_orig?: LocalOrigResolver<string | null, TypeParent, Context>;

    missed_bytes?: MissedBytesResolver<number | null, TypeParent, Context>;

    state?: StateResolver<string | null, TypeParent, Context>;

    history?: HistoryResolver<string | null, TypeParent, Context>;
  }

  export type LocalRespResolver<
    R = string | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LocalOrigResolver<
    R = string | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MissedBytesResolver<
    R = number | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StateResolver<
    R = string | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HistoryResolver<
    R = string | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekNoticeDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekNoticeData> {
    suppress_for?: SuppressForResolver<number | null, TypeParent, Context>;

    msg?: MsgResolver<string | null, TypeParent, Context>;

    note?: NoteResolver<string | null, TypeParent, Context>;

    sub?: SubResolver<string | null, TypeParent, Context>;

    dst?: DstResolver<string | null, TypeParent, Context>;

    dropped?: DroppedResolver<boolean | null, TypeParent, Context>;

    peer_descr?: PeerDescrResolver<string | null, TypeParent, Context>;
  }

  export type SuppressForResolver<
    R = number | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MsgResolver<
    R = string | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoteResolver<
    R = string | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SubResolver<
    R = string | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DstResolver<
    R = string | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DroppedResolver<
    R = boolean | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PeerDescrResolver<
    R = string | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekDnsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekDnsData> {
    AA?: AaResolver<boolean | null, TypeParent, Context>;

    qclass_name?: QclassNameResolver<string | null, TypeParent, Context>;

    RD?: RdResolver<boolean | null, TypeParent, Context>;

    qtype_name?: QtypeNameResolver<string | null, TypeParent, Context>;

    rejected?: RejectedResolver<boolean | null, TypeParent, Context>;

    qtype?: QtypeResolver<number | null, TypeParent, Context>;

    query?: QueryResolver<string | null, TypeParent, Context>;

    trans_id?: TransIdResolver<number | null, TypeParent, Context>;

    qclass?: QclassResolver<number | null, TypeParent, Context>;

    RA?: RaResolver<boolean | null, TypeParent, Context>;

    TC?: TcResolver<boolean | null, TypeParent, Context>;
  }

  export type AaResolver<
    R = boolean | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QclassNameResolver<
    R = string | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RdResolver<
    R = boolean | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QtypeNameResolver<
    R = string | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RejectedResolver<
    R = boolean | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QtypeResolver<
    R = number | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QueryResolver<
    R = string | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransIdResolver<
    R = number | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QclassResolver<
    R = number | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RaResolver<
    R = boolean | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TcResolver<
    R = boolean | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekHttpDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekHttpData> {
    resp_mime_types?: RespMimeTypesResolver<string[] | null, TypeParent, Context>;

    trans_depth?: TransDepthResolver<string | null, TypeParent, Context>;

    status_msg?: StatusMsgResolver<string | null, TypeParent, Context>;

    resp_fuids?: RespFuidsResolver<string[] | null, TypeParent, Context>;

    tags?: TagsResolver<string[] | null, TypeParent, Context>;
  }

  export type RespMimeTypesResolver<
    R = string[] | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransDepthResolver<
    R = string | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StatusMsgResolver<
    R = string | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RespFuidsResolver<
    R = string[] | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TagsResolver<
    R = string[] | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekFileDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekFileData> {
    session_ids?: SessionIdsResolver<string[] | null, TypeParent, Context>;

    timedout?: TimedoutResolver<boolean | null, TypeParent, Context>;

    local_orig?: LocalOrigResolver<boolean | null, TypeParent, Context>;

    tx_host?: TxHostResolver<string | null, TypeParent, Context>;

    source?: SourceResolver<string | null, TypeParent, Context>;

    is_orig?: IsOrigResolver<boolean | null, TypeParent, Context>;

    overflow_bytes?: OverflowBytesResolver<number | null, TypeParent, Context>;

    sha1?: Sha1Resolver<string | null, TypeParent, Context>;

    duration?: DurationResolver<number | null, TypeParent, Context>;

    depth?: DepthResolver<number | null, TypeParent, Context>;

    analyzers?: AnalyzersResolver<string[] | null, TypeParent, Context>;

    mime_type?: MimeTypeResolver<string | null, TypeParent, Context>;

    rx_host?: RxHostResolver<string | null, TypeParent, Context>;

    total_bytes?: TotalBytesResolver<number | null, TypeParent, Context>;

    fuid?: FuidResolver<string | null, TypeParent, Context>;

    seen_bytes?: SeenBytesResolver<number | null, TypeParent, Context>;

    missing_bytes?: MissingBytesResolver<number | null, TypeParent, Context>;

    md5?: Md5Resolver<string | null, TypeParent, Context>;
  }

  export type SessionIdsResolver<
    R = string[] | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimedoutResolver<
    R = boolean | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LocalOrigResolver<
    R = boolean | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TxHostResolver<
    R = string | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = string | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IsOrigResolver<
    R = boolean | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OverflowBytesResolver<
    R = number | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type Sha1Resolver<
    R = string | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DurationResolver<
    R = number | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DepthResolver<
    R = number | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AnalyzersResolver<
    R = string[] | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MimeTypeResolver<
    R = string | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RxHostResolver<
    R = string | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalBytesResolver<
    R = number | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FuidResolver<
    R = string | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SeenBytesResolver<
    R = number | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MissingBytesResolver<
    R = number | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type Md5Resolver<
    R = string | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekSslDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekSslData> {
    cipher?: CipherResolver<string | null, TypeParent, Context>;

    established?: EstablishedResolver<boolean | null, TypeParent, Context>;

    resumed?: ResumedResolver<boolean | null, TypeParent, Context>;

    version?: VersionResolver<string | null, TypeParent, Context>;
  }

  export type CipherResolver<
    R = string | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EstablishedResolver<
    R = boolean | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ResumedResolver<
    R = boolean | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpEcsFields> {
    version?: VersionResolver<string | null, TypeParent, Context>;

    request?: RequestResolver<HttpRequestData | null, TypeParent, Context>;

    response?: ResponseResolver<HttpResponseData | null, TypeParent, Context>;
  }

  export type VersionResolver<
    R = string | null,
    Parent = HttpEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RequestResolver<
    R = HttpRequestData | null,
    Parent = HttpEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ResponseResolver<
    R = HttpResponseData | null,
    Parent = HttpEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpRequestDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpRequestData> {
    method?: MethodResolver<string | null, TypeParent, Context>;

    body?: BodyResolver<HttpBodyData | null, TypeParent, Context>;

    referrer?: ReferrerResolver<string | null, TypeParent, Context>;

    bytes?: BytesResolver<number | null, TypeParent, Context>;
  }

  export type MethodResolver<
    R = string | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BodyResolver<
    R = HttpBodyData | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ReferrerResolver<
    R = string | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BytesResolver<
    R = number | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpBodyDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpBodyData> {
    content?: ContentResolver<string | null, TypeParent, Context>;

    bytes?: BytesResolver<number | null, TypeParent, Context>;
  }

  export type ContentResolver<
    R = string | null,
    Parent = HttpBodyData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BytesResolver<
    R = number | null,
    Parent = HttpBodyData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpResponseDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpResponseData> {
    status_code?: StatusCodeResolver<number | null, TypeParent, Context>;

    body?: BodyResolver<HttpBodyData | null, TypeParent, Context>;

    bytes?: BytesResolver<number | null, TypeParent, Context>;
  }

  export type StatusCodeResolver<
    R = number | null,
    Parent = HttpResponseData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BodyResolver<
    R = HttpBodyData | null,
    Parent = HttpResponseData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BytesResolver<
    R = number | null,
    Parent = HttpResponseData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UrlEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UrlEcsFields> {
    domain?: DomainResolver<string | null, TypeParent, Context>;

    original?: OriginalResolver<string | null, TypeParent, Context>;

    username?: UsernameResolver<string | null, TypeParent, Context>;

    password?: PasswordResolver<string | null, TypeParent, Context>;
  }

  export type DomainResolver<
    R = string | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OriginalResolver<
    R = string | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UsernameResolver<
    R = string | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PasswordResolver<
    R = string | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ProcessEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ProcessEcsFields> {
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
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PpidResolver<
    R = number | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ArgsResolver<
    R = (string | null)[] | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExecutableResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TitleResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ThreadResolver<
    R = Thread | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type WorkingDirectoryResolver<
    R = string | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ThreadResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Thread> {
    id?: IdResolver<number | null, TypeParent, Context>;

    start?: StartResolver<string | null, TypeParent, Context>;
  }

  export type IdResolver<R = number | null, Parent = Thread, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type StartResolver<R = string | null, Parent = Thread, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace FileFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = FileFields> {
    path?: PathResolver<string | null, TypeParent, Context>;

    target_path?: TargetPathResolver<string | null, TypeParent, Context>;

    extension?: ExtensionResolver<string | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;

    device?: DeviceResolver<string | null, TypeParent, Context>;

    inode?: InodeResolver<string | null, TypeParent, Context>;

    uid?: UidResolver<string | null, TypeParent, Context>;

    owner?: OwnerResolver<string | null, TypeParent, Context>;

    gid?: GidResolver<string | null, TypeParent, Context>;

    group?: GroupResolver<string | null, TypeParent, Context>;

    mode?: ModeResolver<string | null, TypeParent, Context>;

    size?: SizeResolver<number | null, TypeParent, Context>;

    mtime?: MtimeResolver<Date | null, TypeParent, Context>;

    ctime?: CtimeResolver<Date | null, TypeParent, Context>;
  }

  export type PathResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TargetPathResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExtensionResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DeviceResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InodeResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UidResolver<R = string | null, Parent = FileFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type OwnerResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GidResolver<R = string | null, Parent = FileFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type GroupResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ModeResolver<
    R = string | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SizeResolver<
    R = number | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MtimeResolver<R = Date | null, Parent = FileFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CtimeResolver<R = Date | null, Parent = FileFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace TimelineDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineData> {
    edges?: EdgesResolver<TimelineEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = TimelineEdges[],
    Parent = TimelineData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = TimelineData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = TimelineData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TimelineEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineEdges> {
    node?: NodeResolver<TimelineItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = TimelineItem,
    Parent = TimelineEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = TimelineEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TimelineItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    _index?: IndexResolver<string | null, TypeParent, Context>;

    data?: DataResolver<TimelineNonEcsData[], TypeParent, Context>;

    ecs?: EcsResolver<Ecs, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = TimelineItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IndexResolver<
    R = string | null,
    Parent = TimelineItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DataResolver<
    R = TimelineNonEcsData[],
    Parent = TimelineItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EcsResolver<R = Ecs, Parent = TimelineItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace TimelineNonEcsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineNonEcsData> {
    field?: FieldResolver<string, TypeParent, Context>;

    value?: ValueResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type FieldResolver<
    R = string,
    Parent = TimelineNonEcsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = ToStringArray | null,
    Parent = TimelineNonEcsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TimelineDetailsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineDetailsData> {
    data?: DataResolver<DetailItem[] | null, TypeParent, Context>;
  }

  export type DataResolver<
    R = DetailItem[] | null,
    Parent = TimelineDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DetailItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DetailItem> {
    category?: CategoryResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    example?: ExampleResolver<string | null, TypeParent, Context>;

    field?: FieldResolver<string, TypeParent, Context>;

    type?: TypeResolver<string, TypeParent, Context>;

    values?: ValuesResolver<ToStringArray | null, TypeParent, Context>;

    originalValue?: OriginalValueResolver<EsValue | null, TypeParent, Context>;
  }

  export type CategoryResolver<R = string, Parent = DetailItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DescriptionResolver<
    R = string | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExampleResolver<
    R = string | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FieldResolver<R = string, Parent = DetailItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = DetailItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ValuesResolver<
    R = ToStringArray | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OriginalValueResolver<
    R = EsValue | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostsData> {
    edges?: EdgesResolver<HostsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<R = HostsEdges[], Parent = HostsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TotalCountResolver<R = number, Parent = HostsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PageInfoResolver<R = PageInfo, Parent = HostsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace HostsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostsEdges> {
    node?: NodeResolver<HostItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = HostItem, Parent = HostsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<R = CursorType, Parent = HostsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace HostItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    firstSeen?: FirstSeenResolver<Date | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;

    lastBeat?: LastBeatResolver<Date | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = HostItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FirstSeenResolver<
    R = Date | null,
    Parent = HostItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = HostItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastBeatResolver<
    R = Date | null,
    Parent = HostItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace IpOverviewDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = IpOverviewData> {
    source?: SourceResolver<Overview | null, TypeParent, Context>;

    destination?: DestinationResolver<Overview | null, TypeParent, Context>;
  }

  export type SourceResolver<
    R = Overview | null,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = Overview | null,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OverviewResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Overview> {
    firstSeen?: FirstSeenResolver<Date | null, TypeParent, Context>;

    lastSeen?: LastSeenResolver<Date | null, TypeParent, Context>;

    autonomousSystem?: AutonomousSystemResolver<AutonomousSystem, TypeParent, Context>;

    host?: HostResolver<HostEcsFields, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields, TypeParent, Context>;
  }

  export type FirstSeenResolver<
    R = Date | null,
    Parent = Overview,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastSeenResolver<
    R = Date | null,
    Parent = Overview,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AutonomousSystemResolver<
    R = AutonomousSystem,
    Parent = Overview,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<R = HostEcsFields, Parent = Overview, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type GeoResolver<R = GeoEcsFields, Parent = Overview, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace AutonomousSystemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AutonomousSystem> {
    as_org?: AsOrgResolver<string | null, TypeParent, Context>;

    asn?: AsnResolver<string | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;
  }

  export type AsOrgResolver<
    R = string | null,
    Parent = AutonomousSystem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AsnResolver<
    R = string | null,
    Parent = AutonomousSystem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = AutonomousSystem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DomainsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DomainsData> {
    domain_name?: DomainNameResolver<string | null, TypeParent, Context>;
  }

  export type DomainNameResolver<
    R = string | null,
    Parent = DomainsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace KpiNetworkDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KpiNetworkData> {
    networkEvents?: NetworkEventsResolver<number | null, TypeParent, Context>;

    uniqueFlowId?: UniqueFlowIdResolver<number | null, TypeParent, Context>;

    activeAgents?: ActiveAgentsResolver<number | null, TypeParent, Context>;

    uniqueSourcePrivateIps?: UniqueSourcePrivateIpsResolver<number | null, TypeParent, Context>;

    uniqueDestinationPrivateIps?: UniqueDestinationPrivateIpsResolver<
      number | null,
      TypeParent,
      Context
    >;

    dnsQueries?: DnsQueriesResolver<number | null, TypeParent, Context>;

    tlsHandshakes?: TlsHandshakesResolver<number | null, TypeParent, Context>;
  }

  export type NetworkEventsResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueFlowIdResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ActiveAgentsResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueSourcePrivateIpsResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDestinationPrivateIpsResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsQueriesResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TlsHandshakesResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkTopNFlowData> {
    edges?: EdgesResolver<NetworkTopNFlowEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = NetworkTopNFlowEdges[],
    Parent = NetworkTopNFlowData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkTopNFlowData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = NetworkTopNFlowData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkTopNFlowEdges> {
    node?: NodeResolver<NetworkTopNFlowItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = NetworkTopNFlowItem,
    Parent = NetworkTopNFlowEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkTopNFlowEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkTopNFlowItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    source?: SourceResolver<TopNFlowItem | null, TypeParent, Context>;

    destination?: DestinationResolver<TopNFlowItem | null, TypeParent, Context>;

    client?: ClientResolver<TopNFlowItem | null, TypeParent, Context>;

    server?: ServerResolver<TopNFlowItem | null, TypeParent, Context>;

    network?: NetworkResolver<TopNFlowNetworkEcsField | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = Date | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ClientResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ServerResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NetworkResolver<
    R = TopNFlowNetworkEcsField | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TopNFlowItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TopNFlowItem> {
    count?: CountResolver<number | null, TypeParent, Context>;

    domain?: DomainResolver<string[] | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;
  }

  export type CountResolver<
    R = number | null,
    Parent = TopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = string[] | null,
    Parent = TopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = TopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TopNFlowNetworkEcsFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TopNFlowNetworkEcsField> {
    bytes?: BytesResolver<number | null, TypeParent, Context>;

    packets?: PacketsResolver<number | null, TypeParent, Context>;

    transport?: TransportResolver<string | null, TypeParent, Context>;

    direction?: DirectionResolver<NetworkDirectionEcs[] | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = number | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = number | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransportResolver<
    R = string | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DirectionResolver<
    R = NetworkDirectionEcs[] | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkDnsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkDnsData> {
    edges?: EdgesResolver<NetworkDnsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = NetworkDnsEdges[],
    Parent = NetworkDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = NetworkDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkDnsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkDnsEdges> {
    node?: NodeResolver<NetworkDnsItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = NetworkDnsItem,
    Parent = NetworkDnsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkDnsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkDnsItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkDnsItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    dnsBytesIn?: DnsBytesInResolver<number | null, TypeParent, Context>;

    dnsBytesOut?: DnsBytesOutResolver<number | null, TypeParent, Context>;

    dnsName?: DnsNameResolver<string | null, TypeParent, Context>;

    queryCount?: QueryCountResolver<number | null, TypeParent, Context>;

    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    uniqueDomains?: UniqueDomainsResolver<number | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsBytesInResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsBytesOutResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsNameResolver<
    R = string | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QueryCountResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = Date | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDomainsResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OverviewNetworkDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = OverviewNetworkData> {
    packetbeatFlow?: PacketbeatFlowResolver<number, TypeParent, Context>;

    packetbeatDNS?: PacketbeatDnsResolver<number, TypeParent, Context>;

    filebeatSuricata?: FilebeatSuricataResolver<number, TypeParent, Context>;

    filebeatZeek?: FilebeatZeekResolver<number | null, TypeParent, Context>;

    auditbeatSocket?: AuditbeatSocketResolver<number | null, TypeParent, Context>;
  }

  export type PacketbeatFlowResolver<
    R = number,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatDnsResolver<
    R = number,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatSuricataResolver<
    R = number,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatZeekResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatSocketResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OverviewHostDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = OverviewHostData> {
    auditbeatAuditd?: AuditbeatAuditdResolver<number, TypeParent, Context>;

    auditbeatFIM?: AuditbeatFimResolver<number, TypeParent, Context>;

    auditbeatLogin?: AuditbeatLoginResolver<number, TypeParent, Context>;

    auditbeatPackage?: AuditbeatPackageResolver<number | null, TypeParent, Context>;

    auditbeatProcess?: AuditbeatProcessResolver<number | null, TypeParent, Context>;

    auditbeatUser?: AuditbeatUserResolver<number | null, TypeParent, Context>;
  }

  export type AuditbeatAuditdResolver<
    R = number,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatFimResolver<
    R = number,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatLoginResolver<
    R = number,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatPackageResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatProcessResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatUserResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessesDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UncommonProcessesData> {
    edges?: EdgesResolver<UncommonProcessesEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = UncommonProcessesEdges[],
    Parent = UncommonProcessesData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = UncommonProcessesData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = UncommonProcessesData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessesEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UncommonProcessesEdges> {
    node?: NodeResolver<UncommonProcessItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = UncommonProcessItem,
    Parent = UncommonProcessesEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = UncommonProcessesEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UncommonProcessItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    instances?: InstancesResolver<number, TypeParent, Context>;

    process?: ProcessResolver<ProcessEcsFields, TypeParent, Context>;

    host?: HostResolver<HostEcsFields[], TypeParent, Context>;

    user?: UserResolver<UserEcsFields | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InstancesResolver<
    R = number,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProcessResolver<
    R = ProcessEcsFields,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields[],
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields | null,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SayMyNameResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SayMyName> {
    /** The id of the source */
    appName?: AppNameResolver<string, TypeParent, Context>;
  }

  export type AppNameResolver<R = string, Parent = SayMyName, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}
