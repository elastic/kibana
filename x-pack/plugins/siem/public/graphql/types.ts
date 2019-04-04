/* tslint:disable */
/*
     * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
     * or more contributor license agreements. Licensed under the Elastic License;
     * you may not use this file except in compliance with the Elastic License.
     */

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
  action?: string | null;

  category?: string | null;

  created?: Date | null;

  dataset?: string | null;

  duration?: number | null;

  end?: Date | null;

  hash?: string | null;

  id?: string | null;

  kind?: string | null;

  module?: string | null;

  original?: (string | null)[] | null;

  outcome?: string | null;

  risk_score?: number | null;

  risk_score_norm?: number | null;

  severity?: number | null;

  start?: Date | null;

  timezone?: string | null;

  type?: string | null;
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
// Documents
// ====================================================

export namespace GetAuthenticationsQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Authentications: Authentications;
  };

  export type Authentications = {
    __typename?: 'AuthenticationsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'AuthenticationsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'AuthenticationItem';

    _id: string;

    failures: number;

    successes: number;

    user: User;

    lastSuccess?: LastSuccess | null;

    lastFailure?: LastFailure | null;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    name?: string | null;
  };

  export type LastSuccess = {
    __typename?: 'LastSourceHost';

    timestamp?: Date | null;

    source?: _Source | null;

    host?: Host | null;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    ip?: string | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: string | null;

    name?: string | null;
  };

  export type LastFailure = {
    __typename?: 'LastSourceHost';

    timestamp?: Date | null;

    source?: __Source | null;

    host?: _Host | null;
  };

  export type __Source = {
    __typename?: 'SourceEcsFields';

    ip?: string | null;
  };

  export type _Host = {
    __typename?: 'HostEcsFields';

    id?: string | null;

    name?: string | null;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: string;
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;
  };
}

export namespace GetEventsQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInput;
    sortField: SortField;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Events: Events;
  };

  export type Events = {
    __typename?: 'EventsData';

    totalCount: number;

    pageInfo: PageInfo;

    edges: Edges[];
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;

    tiebreaker?: string | null;
  };

  export type Edges = {
    __typename?: 'EcsEdges';

    node: Node;
  };

  export type Node = {
    __typename?: 'ECS';

    _id: string;

    _index?: string | null;

    timestamp?: Date | null;

    event?: Event | null;

    host?: Host | null;

    source?: _Source | null;

    destination?: Destination | null;

    geo?: Geo | null;

    suricata?: Suricata | null;

    zeek?: Zeek | null;
  };

  export type Event = {
    __typename?: 'EventEcsFields';

    action?: string | null;

    severity?: number | null;

    module?: string | null;

    category?: string | null;

    id?: string | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    name?: string | null;

    ip?: (string | null)[] | null;

    id?: string | null;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    ip?: string | null;

    port?: number | null;
  };

  export type Destination = {
    __typename?: 'DestinationEcsFields';

    ip?: string | null;

    port?: number | null;
  };

  export type Geo = {
    __typename?: 'GeoEcsFields';

    region_name?: string | null;

    country_iso_code?: string | null;
  };

  export type Suricata = {
    __typename?: 'SuricataEcsFields';

    eve?: Eve | null;
  };

  export type Eve = {
    __typename?: 'SuricataEveData';

    proto?: string | null;

    flow_id?: number | null;

    alert?: Alert | null;
  };

  export type Alert = {
    __typename?: 'SuricataAlertData';

    signature?: string | null;

    signature_id?: number | null;
  };

  export type Zeek = {
    __typename?: 'ZeekEcsFields';

    session_id?: string | null;
  };
}

export namespace GetHostSummaryQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Hosts: Hosts;
  };

  export type Hosts = {
    __typename?: 'HostsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'HostsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'HostItem';

    _id?: string | null;

    firstSeen?: Date | null;

    lastBeat?: Date | null;

    host?: Host | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    architecture?: string | null;

    id?: string | null;

    ip?: (string | null)[] | null;

    mac?: (string | null)[] | null;

    name?: string | null;

    os?: Os | null;

    type?: string | null;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    family?: string | null;

    name?: string | null;

    platform?: string | null;

    version?: string | null;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: string;
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;
  };
}

export namespace GetHostsTableQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Hosts: Hosts;
  };

  export type Hosts = {
    __typename?: 'HostsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'HostsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'HostItem';

    _id?: string | null;

    firstSeen?: Date | null;

    lastBeat?: Date | null;

    host?: Host | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: string | null;

    name?: string | null;

    os?: Os | null;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    name?: string | null;

    version?: string | null;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: string;
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;
  };
}

export namespace GetIpOverviewQuery {
  export type Variables = {
    sourceId: string;
    filterQuery?: string | null;
    ip: string;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    IpOverview?: IpOverview | null;
  };

  export type IpOverview = {
    __typename?: 'IpOverviewData';

    source?: _Source | null;

    destination?: Destination | null;
  };

  export type _Source = {
    __typename?: 'Overview';

    firstSeen?: Date | null;

    lastSeen?: Date | null;

    autonomousSystem: AutonomousSystem;

    geo: Geo;

    host: Host;
  };

  export type AutonomousSystem = {
    __typename?: 'AutonomousSystem';

    as_org?: string | null;

    asn?: string | null;

    ip?: string | null;
  };

  export type Geo = {
    __typename?: 'GeoEcsFields';

    continent_name?: string | null;

    city_name?: string | null;

    country_iso_code?: string | null;

    country_name?: string | null;

    location?: Location | null;

    region_iso_code?: string | null;

    region_name?: string | null;
  };

  export type Location = {
    __typename?: 'Location';

    lat?: number | null;

    lon?: number | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    architecture?: string | null;

    id?: string | null;

    ip?: (string | null)[] | null;

    mac?: (string | null)[] | null;

    name?: string | null;

    os?: Os | null;

    type?: string | null;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    family?: string | null;

    name?: string | null;

    platform?: string | null;

    version?: string | null;
  };

  export type Destination = {
    __typename?: 'Overview';

    firstSeen?: Date | null;

    lastSeen?: Date | null;

    autonomousSystem: _AutonomousSystem;

    geo: _Geo;

    host: _Host;
  };

  export type _AutonomousSystem = {
    __typename?: 'AutonomousSystem';

    as_org?: string | null;

    asn?: string | null;

    ip?: string | null;
  };

  export type _Geo = {
    __typename?: 'GeoEcsFields';

    continent_name?: string | null;

    city_name?: string | null;

    country_iso_code?: string | null;

    country_name?: string | null;

    location?: _Location | null;

    region_iso_code?: string | null;

    region_name?: string | null;
  };

  export type _Location = {
    __typename?: 'Location';

    lat?: number | null;

    lon?: number | null;
  };

  export type _Host = {
    __typename?: 'HostEcsFields';

    architecture?: string | null;

    id?: string | null;

    ip?: (string | null)[] | null;

    mac?: (string | null)[] | null;

    name?: string | null;

    os?: _Os | null;

    type?: string | null;
  };

  export type _Os = {
    __typename?: 'OsEcsFields';

    family?: string | null;

    name?: string | null;

    platform?: string | null;

    version?: string | null;
  };
}

export namespace GetKpiEventsQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: string | null;
    pagination: PaginationInput;
    sortField: SortField;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Events: Events;
  };

  export type Events = {
    __typename?: 'EventsData';

    kpiEventType?: KpiEventType[] | null;
  };

  export type KpiEventType = {
    __typename?: 'KpiItem';

    value?: string | null;

    count: number;
  };
}

export namespace GetKpiNetworkQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    KpiNetwork?: KpiNetwork | null;
  };

  export type KpiNetwork = {
    __typename?: 'KpiNetworkData';

    networkEvents?: number | null;

    uniqueFlowId?: number | null;

    activeAgents?: number | null;

    uniqueSourcePrivateIps?: number | null;

    uniqueDestinationPrivateIps?: number | null;

    dnsQueries?: number | null;

    tlsHandshakes?: number | null;
  };
}

export namespace GetNetworkDnsQuery {
  export type Variables = {
    sourceId: string;
    sort: NetworkDnsSortField;
    isPtrIncluded: boolean;
    timerange: TimerangeInput;
    pagination: PaginationInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    NetworkDns: NetworkDns;
  };

  export type NetworkDns = {
    __typename?: 'NetworkDnsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'NetworkDnsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'NetworkDnsItem';

    _id?: string | null;

    dnsBytesIn?: number | null;

    dnsBytesOut?: number | null;

    dnsName?: string | null;

    queryCount?: number | null;

    uniqueDomains?: number | null;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: string;
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;
  };
}

export namespace GetNetworkTopNFlowQuery {
  export type Variables = {
    sourceId: string;
    direction: NetworkTopNFlowDirection;
    filterQuery?: string | null;
    pagination: PaginationInput;
    sort: NetworkTopNFlowSortField;
    type: NetworkTopNFlowType;
    timerange: TimerangeInput;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    NetworkTopNFlow: NetworkTopNFlow;
  };

  export type NetworkTopNFlow = {
    __typename?: 'NetworkTopNFlowData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'NetworkTopNFlowEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'NetworkTopNFlowItem';

    source?: _Source | null;

    destination?: Destination | null;

    client?: Client | null;

    server?: Server | null;

    network?: Network | null;
  };

  export type _Source = {
    __typename?: 'TopNFlowItem';

    count?: number | null;

    ip?: string | null;

    domain?: string[] | null;
  };

  export type Destination = {
    __typename?: 'TopNFlowItem';

    count?: number | null;

    ip?: string | null;

    domain?: string[] | null;
  };

  export type Client = {
    __typename?: 'TopNFlowItem';

    count?: number | null;

    ip?: string | null;

    domain?: string[] | null;
  };

  export type Server = {
    __typename?: 'TopNFlowItem';

    count?: number | null;

    ip?: string | null;

    domain?: string[] | null;
  };

  export type Network = {
    __typename?: 'TopNFlowNetworkEcsField';

    bytes?: number | null;

    direction?: NetworkDirectionEcs[] | null;

    packets?: number | null;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: string;
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;
  };
}

export namespace GetOverviewHostQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    OverviewHost?: OverviewHost | null;
  };

  export type OverviewHost = {
    __typename?: 'OverviewHostData';

    auditbeatAuditd: number;

    auditbeatFIM: number;

    auditbeatLogin: number;

    auditbeatPackage?: number | null;

    auditbeatProcess?: number | null;

    auditbeatUser?: number | null;
  };
}

export namespace GetOverviewNetworkQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    OverviewNetwork?: OverviewNetwork | null;
  };

  export type OverviewNetwork = {
    __typename?: 'OverviewNetworkData';

    packetbeatFlow: number;

    packetbeatDNS: number;

    filebeatSuricata: number;

    filebeatZeek?: number | null;

    auditbeatSocket?: number | null;
  };
}

export namespace SourceQuery {
  export type Variables = {
    sourceId?: string | null;
    indexTypes?: IndexType[] | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    configuration: Configuration;

    status: Status;
  };

  export type Configuration = {
    __typename?: 'SourceConfiguration';

    auditbeatAlias: string;

    logAlias: string;

    packetbeatAlias: string;
  };

  export type Status = {
    __typename?: 'SourceStatus';

    auditbeatIndicesExist: boolean;

    auditbeatAliasExists: boolean;

    auditbeatIndices: string[];

    filebeatIndicesExist: boolean;

    filebeatAliasExists: boolean;

    filebeatIndices: string[];

    indexFields: IndexFields[];
  };

  export type IndexFields = {
    __typename?: 'IndexField';

    category: string;

    description?: string | null;

    example?: string | null;

    indexes: (string | null)[];

    name: string;

    searchable: boolean;

    type: string;

    aggregatable: boolean;
  };
}

export namespace GetTimelineDetailsQuery {
  export type Variables = {
    sourceId: string;
    eventId: string;
    indexName: string;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    TimelineDetails: TimelineDetails;
  };

  export type TimelineDetails = {
    __typename?: 'TimelineDetailsData';

    data?: Data[] | null;
  };

  export type Data = {
    __typename?: 'DetailItem';

    category: string;

    description?: string | null;

    example?: string | null;

    field: string;

    type: string;

    values?: ToStringArray | null;

    originalValue?: EsValue | null;
  };
}

export namespace GetTimelineQuery {
  export type Variables = {
    sourceId: string;
    fieldRequested: string[];
    pagination: PaginationInput;
    sortField: SortField;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Timeline: Timeline;
  };

  export type Timeline = {
    __typename?: 'TimelineData';

    totalCount: number;

    pageInfo: PageInfo;

    edges: Edges[];
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;

    tiebreaker?: string | null;
  };

  export type Edges = {
    __typename?: 'TimelineEdges';

    node: Node;
  };

  export type Node = {
    __typename?: 'TimelineItem';

    _id: string;

    _index?: string | null;

    data: Data[];

    ecs: Ecs;
  };

  export type Data = {
    __typename?: 'TimelineNonEcsData';

    field: string;

    value?: ToStringArray | null;
  };

  export type Ecs = {
    __typename?: 'ECS';

    _id: string;

    _index?: string | null;

    timestamp?: Date | null;

    event?: Event | null;

    auditd?: Auditd | null;

    file?: File | null;

    host?: Host | null;

    source?: _Source | null;

    destination?: Destination | null;

    geo?: __Geo | null;

    suricata?: Suricata | null;

    network?: Network | null;

    http?: Http | null;

    tls?: Tls | null;

    url?: Url | null;

    user?: User | null;

    process?: Process | null;

    zeek?: Zeek | null;
  };

  export type Event = {
    __typename?: 'EventEcsFields';

    action?: string | null;

    category?: string | null;

    created?: Date | null;

    dataset?: string | null;

    duration?: number | null;

    end?: Date | null;

    hash?: string | null;

    id?: string | null;

    kind?: string | null;

    module?: string | null;

    original?: (string | null)[] | null;

    outcome?: string | null;

    risk_score?: number | null;

    risk_score_norm?: number | null;

    severity?: number | null;

    start?: Date | null;

    timezone?: string | null;

    type?: string | null;
  };

  export type Auditd = {
    __typename?: 'AuditdEcsFields';

    result?: string | null;

    session?: string | null;

    data?: _Data | null;

    summary?: Summary | null;
  };

  export type _Data = {
    __typename?: 'AuditdData';

    acct?: string | null;

    terminal?: string | null;

    op?: string | null;
  };

  export type Summary = {
    __typename?: 'Summary';

    actor?: Actor | null;

    object?: Object | null;

    how?: string | null;

    message_type?: string | null;

    sequence?: number | null;
  };

  export type Actor = {
    __typename?: 'PrimarySecondary';

    primary?: string | null;

    secondary?: string | null;
  };

  export type Object = {
    __typename?: 'PrimarySecondary';

    primary?: string | null;

    secondary?: string | null;

    type?: string | null;
  };

  export type File = {
    __typename?: 'FileFields';

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
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: string | null;

    name?: string | null;

    ip?: (string | null)[] | null;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    bytes?: number | null;

    ip?: string | null;

    packets?: number | null;

    port?: number | null;

    geo?: Geo | null;
  };

  export type Geo = {
    __typename?: 'GeoEcsFields';

    continent_name?: string | null;

    country_name?: string | null;

    country_iso_code?: string | null;

    city_name?: string | null;

    region_iso_code?: string | null;

    region_name?: string | null;
  };

  export type Destination = {
    __typename?: 'DestinationEcsFields';

    bytes?: number | null;

    ip?: string | null;

    packets?: number | null;

    port?: number | null;

    geo?: _Geo | null;
  };

  export type _Geo = {
    __typename?: 'GeoEcsFields';

    continent_name?: string | null;

    country_name?: string | null;

    country_iso_code?: string | null;

    city_name?: string | null;

    region_iso_code?: string | null;

    region_name?: string | null;
  };

  export type __Geo = {
    __typename?: 'GeoEcsFields';

    region_name?: string | null;

    country_iso_code?: string | null;
  };

  export type Suricata = {
    __typename?: 'SuricataEcsFields';

    eve?: Eve | null;
  };

  export type Eve = {
    __typename?: 'SuricataEveData';

    proto?: string | null;

    flow_id?: number | null;

    alert?: Alert | null;
  };

  export type Alert = {
    __typename?: 'SuricataAlertData';

    signature?: string | null;

    signature_id?: number | null;
  };

  export type Network = {
    __typename?: 'NetworkEcsField';

    bytes?: number | null;

    community_id?: string | null;

    direction?: string | null;

    packets?: number | null;

    protocol?: string | null;

    transport?: string | null;
  };

  export type Http = {
    __typename?: 'HttpEcsFields';

    version?: string | null;

    request?: Request | null;

    response?: Response | null;
  };

  export type Request = {
    __typename?: 'HttpRequestData';

    method?: string | null;

    body?: Body | null;

    referrer?: string | null;
  };

  export type Body = {
    __typename?: 'HttpBodyData';

    bytes?: number | null;

    content?: string | null;
  };

  export type Response = {
    __typename?: 'HttpResponseData';

    status_code?: number | null;

    body?: _Body | null;
  };

  export type _Body = {
    __typename?: 'HttpBodyData';

    bytes?: number | null;

    content?: string | null;
  };

  export type Tls = {
    __typename?: 'TlsEcsFields';

    client_certificate?: ClientCertificate | null;

    fingerprints?: Fingerprints | null;

    server_certificate?: ServerCertificate | null;
  };

  export type ClientCertificate = {
    __typename?: 'TlsClientCertificateData';

    fingerprint?: Fingerprint | null;
  };

  export type Fingerprint = {
    __typename?: 'FingerprintData';

    sha1?: string | null;
  };

  export type Fingerprints = {
    __typename?: 'TlsFingerprintsData';

    ja3?: Ja3 | null;
  };

  export type Ja3 = {
    __typename?: 'TlsJa3Data';

    hash?: string | null;
  };

  export type ServerCertificate = {
    __typename?: 'TlsServerCertificateData';

    fingerprint?: _Fingerprint | null;
  };

  export type _Fingerprint = {
    __typename?: 'FingerprintData';

    sha1?: string | null;
  };

  export type Url = {
    __typename?: 'UrlEcsFields';

    original?: string | null;

    domain?: string | null;

    username?: string | null;

    password?: string | null;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    name?: string | null;
  };

  export type Process = {
    __typename?: 'ProcessEcsFields';

    pid?: number | null;

    name?: string | null;

    ppid?: number | null;

    args?: (string | null)[] | null;

    executable?: string | null;

    title?: string | null;

    working_directory?: string | null;
  };

  export type Zeek = {
    __typename?: 'ZeekEcsFields';

    session_id?: string | null;

    connection?: Connection | null;

    notice?: Notice | null;

    dns?: Dns | null;

    http?: _Http | null;

    files?: Files | null;

    ssl?: Ssl | null;
  };

  export type Connection = {
    __typename?: 'ZeekConnectionData';

    local_resp?: string | null;

    local_orig?: string | null;

    missed_bytes?: number | null;

    state?: string | null;

    history?: string | null;
  };

  export type Notice = {
    __typename?: 'ZeekNoticeData';

    suppress_for?: number | null;

    msg?: string | null;

    note?: string | null;

    sub?: string | null;

    dst?: string | null;

    dropped?: boolean | null;

    peer_descr?: string | null;
  };

  export type Dns = {
    __typename?: 'ZeekDnsData';

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
  };

  export type _Http = {
    __typename?: 'ZeekHttpData';

    resp_mime_types?: string[] | null;

    trans_depth?: string | null;

    status_msg?: string | null;

    resp_fuids?: string[] | null;

    tags?: string[] | null;
  };

  export type Files = {
    __typename?: 'ZeekFileData';

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
  };

  export type Ssl = {
    __typename?: 'ZeekSslData';

    cipher?: string | null;

    established?: boolean | null;

    resumed?: boolean | null;

    version?: string | null;
  };
}

export namespace GetUncommonProcessesQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInput;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    UncommonProcesses: UncommonProcesses;
  };

  export type UncommonProcesses = {
    __typename?: 'UncommonProcessesData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'UncommonProcessesEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'UncommonProcessItem';

    _id: string;

    instances: number;

    process: Process;

    user?: User | null;

    host: Host[];
  };

  export type Process = {
    __typename?: 'ProcessEcsFields';

    title?: string | null;

    name?: string | null;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    id?: number | null;

    name?: string | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: string | null;

    name?: string | null;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: string;
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor?: EndCursor | null;

    hasNextPage?: boolean | null;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: string;
  };
}

export namespace WhoAmIQuery {
  export type Variables = {
    sourceId: string;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    whoAmI?: WhoAmI | null;
  };

  export type WhoAmI = {
    __typename?: 'SayMyName';

    appName: string;
  };
}
