/* tslint:disable */
/* eslint-disable */
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

export type ToStringArray = string[];

export type Date = string;

export type ToNumberArray = number[];

export type ToDateArray = string[];

export type ToBooleanArray = boolean[];

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

  LastEventTime: LastEventTimeData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;

  HostOverview: HostItem;

  HostFirstLastSeen: FirstLastSeenHost;

  IpOverview?: IpOverviewData | null;

  Domains: DomainsData;

  DomainFirstLastSeen: FirstLastSeenDomain;

  Tls: TlsData;

  Users: UsersData;

  KpiNetwork?: KpiNetworkData | null;

  KpiHosts: KpiHostsData;
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
  /** The alias to read winlogbeat data from */
  winlogbeatAlias: string;
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
  /** Whether the configured winlogbeat alias exists */
  winlogbeatAliasExists: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any winlogbeat indices */
  winlogbeatIndicesExist: boolean;
  /** The list of indices in the winlogbeat alias */
  winlogbeatIndices: string[];
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
  id?: ToStringArray | null;

  name?: ToStringArray | null;

  full_name?: ToStringArray | null;

  email?: ToStringArray | null;

  hash?: ToStringArray | null;

  group?: ToStringArray | null;
}

export interface LastSourceHost {
  timestamp?: Date | null;

  source?: SourceEcsFields | null;

  host?: HostEcsFields | null;
}

export interface SourceEcsFields {
  bytes?: ToNumberArray | null;

  ip?: ToStringArray | null;

  port?: ToNumberArray | null;

  domain?: ToStringArray | null;

  geo?: GeoEcsFields | null;

  packets?: ToNumberArray | null;
}

export interface GeoEcsFields {
  city_name?: ToStringArray | null;

  continent_name?: ToStringArray | null;

  country_iso_code?: ToStringArray | null;

  country_name?: ToStringArray | null;

  location?: Location | null;

  region_iso_code?: ToStringArray | null;

  region_name?: ToStringArray | null;
}

export interface Location {
  lon?: ToNumberArray | null;

  lat?: ToNumberArray | null;
}

export interface HostEcsFields {
  architecture?: ToStringArray | null;

  id?: ToStringArray | null;

  ip?: ToStringArray | null;

  mac?: ToStringArray | null;

  name?: ToStringArray | null;

  os?: OsEcsFields | null;

  type?: ToStringArray | null;
}

export interface OsEcsFields {
  platform?: ToStringArray | null;

  name?: ToStringArray | null;

  full?: ToStringArray | null;

  family?: ToStringArray | null;

  version?: ToStringArray | null;

  kernel?: ToStringArray | null;
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

  message?: ToStringArray | null;

  user?: UserEcsFields | null;

  process?: ProcessEcsFields | null;

  file?: FileFields | null;

  system?: SystemEcsField | null;
}

export interface AuditdEcsFields {
  result?: ToStringArray | null;

  session?: ToStringArray | null;

  data?: AuditdData | null;

  summary?: Summary | null;

  sequence?: ToStringArray | null;
}

export interface AuditdData {
  acct?: ToStringArray | null;

  terminal?: ToStringArray | null;

  op?: ToStringArray | null;
}

export interface Summary {
  actor?: PrimarySecondary | null;

  object?: PrimarySecondary | null;

  how?: ToStringArray | null;

  message_type?: ToStringArray | null;

  sequence?: ToStringArray | null;
}

export interface PrimarySecondary {
  primary?: ToStringArray | null;

  secondary?: ToStringArray | null;

  type?: ToStringArray | null;
}

export interface DestinationEcsFields {
  bytes?: ToNumberArray | null;

  ip?: ToStringArray | null;

  port?: ToNumberArray | null;

  domain?: ToStringArray | null;

  geo?: GeoEcsFields | null;

  packets?: ToNumberArray | null;
}

export interface EventEcsFields {
  action?: ToStringArray | null;

  category?: ToStringArray | null;

  created?: ToDateArray | null;

  dataset?: ToStringArray | null;

  duration?: ToNumberArray | null;

  end?: ToDateArray | null;

  hash?: ToStringArray | null;

  id?: ToStringArray | null;

  kind?: ToStringArray | null;

  module?: ToStringArray | null;

  original?: ToStringArray | null;

  outcome?: ToStringArray | null;

  risk_score?: ToNumberArray | null;

  risk_score_norm?: ToNumberArray | null;

  severity?: ToNumberArray | null;

  start?: ToDateArray | null;

  timezone?: ToStringArray | null;

  type?: ToStringArray | null;
}

export interface NetworkEcsField {
  bytes?: ToNumberArray | null;

  community_id?: ToStringArray | null;

  direction?: ToStringArray | null;

  packets?: ToNumberArray | null;

  protocol?: ToStringArray | null;

  transport?: ToStringArray | null;
}

export interface SuricataEcsFields {
  eve?: SuricataEveData | null;
}

export interface SuricataEveData {
  alert?: SuricataAlertData | null;

  flow_id?: ToNumberArray | null;

  proto?: ToStringArray | null;
}

export interface SuricataAlertData {
  signature?: ToStringArray | null;

  signature_id?: ToNumberArray | null;
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
  sha1?: ToStringArray | null;
}

export interface TlsFingerprintsData {
  ja3?: TlsJa3Data | null;
}

export interface TlsJa3Data {
  hash?: ToStringArray | null;
}

export interface TlsServerCertificateData {
  fingerprint?: FingerprintData | null;
}

export interface ZeekEcsFields {
  session_id?: ToStringArray | null;

  connection?: ZeekConnectionData | null;

  notice?: ZeekNoticeData | null;

  dns?: ZeekDnsData | null;

  http?: ZeekHttpData | null;

  files?: ZeekFileData | null;

  ssl?: ZeekSslData | null;
}

export interface ZeekConnectionData {
  local_resp?: ToBooleanArray | null;

  local_orig?: ToBooleanArray | null;

  missed_bytes?: ToNumberArray | null;

  state?: ToStringArray | null;

  history?: ToStringArray | null;
}

export interface ZeekNoticeData {
  suppress_for?: ToNumberArray | null;

  msg?: ToStringArray | null;

  note?: ToStringArray | null;

  sub?: ToStringArray | null;

  dst?: ToStringArray | null;

  dropped?: ToBooleanArray | null;

  peer_descr?: ToStringArray | null;
}

export interface ZeekDnsData {
  AA?: ToBooleanArray | null;

  qclass_name?: ToStringArray | null;

  RD?: ToBooleanArray | null;

  qtype_name?: ToStringArray | null;

  rejected?: ToBooleanArray | null;

  qtype?: ToStringArray | null;

  query?: ToStringArray | null;

  trans_id?: ToNumberArray | null;

  qclass?: ToStringArray | null;

  RA?: ToBooleanArray | null;

  TC?: ToBooleanArray | null;
}

export interface ZeekHttpData {
  resp_mime_types?: ToStringArray | null;

  trans_depth?: ToStringArray | null;

  status_msg?: ToStringArray | null;

  resp_fuids?: ToStringArray | null;

  tags?: ToStringArray | null;
}

export interface ZeekFileData {
  session_ids?: ToStringArray | null;

  timedout?: ToBooleanArray | null;

  local_orig?: ToBooleanArray | null;

  tx_host?: ToStringArray | null;

  source?: ToStringArray | null;

  is_orig?: ToBooleanArray | null;

  overflow_bytes?: ToNumberArray | null;

  sha1?: ToStringArray | null;

  duration?: ToNumberArray | null;

  depth?: ToNumberArray | null;

  analyzers?: ToStringArray | null;

  mime_type?: ToStringArray | null;

  rx_host?: ToStringArray | null;

  total_bytes?: ToNumberArray | null;

  fuid?: ToStringArray | null;

  seen_bytes?: ToNumberArray | null;

  missing_bytes?: ToNumberArray | null;

  md5?: ToStringArray | null;
}

export interface ZeekSslData {
  cipher?: ToStringArray | null;

  established?: ToBooleanArray | null;

  resumed?: ToBooleanArray | null;

  version?: ToStringArray | null;
}

export interface HttpEcsFields {
  version?: ToStringArray | null;

  request?: HttpRequestData | null;

  response?: HttpResponseData | null;
}

export interface HttpRequestData {
  method?: ToStringArray | null;

  body?: HttpBodyData | null;

  referrer?: ToStringArray | null;

  bytes?: ToNumberArray | null;
}

export interface HttpBodyData {
  content?: ToStringArray | null;

  bytes?: ToNumberArray | null;
}

export interface HttpResponseData {
  status_code?: ToNumberArray | null;

  body?: HttpBodyData | null;

  bytes?: ToNumberArray | null;
}

export interface UrlEcsFields {
  domain?: ToStringArray | null;

  original?: ToStringArray | null;

  username?: ToStringArray | null;

  password?: ToStringArray | null;
}

export interface ProcessEcsFields {
  pid?: ToNumberArray | null;

  name?: ToStringArray | null;

  ppid?: ToNumberArray | null;

  args?: ToStringArray | null;

  executable?: ToStringArray | null;

  title?: ToStringArray | null;

  thread?: Thread | null;

  working_directory?: ToStringArray | null;
}

export interface Thread {
  id?: ToNumberArray | null;

  start?: ToStringArray | null;
}

export interface FileFields {
  path?: ToStringArray | null;

  target_path?: ToStringArray | null;

  extension?: ToStringArray | null;

  type?: ToStringArray | null;

  device?: ToStringArray | null;

  inode?: ToStringArray | null;

  uid?: ToStringArray | null;

  owner?: ToStringArray | null;

  gid?: ToStringArray | null;

  group?: ToStringArray | null;

  mode?: ToStringArray | null;

  size?: ToNumberArray | null;

  mtime?: ToDateArray | null;

  ctime?: ToDateArray | null;
}

export interface SystemEcsField {
  audit?: AuditEcsFields | null;

  auth?: AuthEcsFields | null;
}

export interface AuditEcsFields {
  package?: PackageEcsFields | null;
}

export interface PackageEcsFields {
  arch?: ToStringArray | null;

  entity_id?: ToStringArray | null;

  name?: ToStringArray | null;

  size?: ToNumberArray | null;

  summary?: ToStringArray | null;

  version?: ToStringArray | null;
}

export interface AuthEcsFields {
  ssh?: SshEcsFields | null;
}

export interface SshEcsFields {
  method?: ToStringArray | null;

  signature?: ToStringArray | null;
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

export interface LastEventTimeData {
  lastSeen?: Date | null;
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

  lastSeen?: Date | null;

  host?: HostEcsFields | null;

  cloud?: CloudFields | null;
}

export interface CloudFields {
  instance?: CloudInstance | null;

  machine?: CloudMachine | null;

  provider?: (string | null)[] | null;

  region?: (string | null)[] | null;
}

export interface CloudInstance {
  id?: (string | null)[] | null;
}

export interface CloudMachine {
  type?: (string | null)[] | null;
}

export interface FirstLastSeenHost {
  firstSeen?: Date | null;

  lastSeen?: Date | null;
}

export interface IpOverviewData {
  client?: Overview | null;

  destination?: Overview | null;

  server?: Overview | null;

  source?: Overview | null;
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
  edges: DomainsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface DomainsEdges {
  node: DomainsNode;

  cursor: CursorType;
}

export interface DomainsNode {
  _id?: string | null;

  timestamp?: Date | null;

  source?: DomainsItem | null;

  destination?: DomainsItem | null;

  client?: DomainsItem | null;

  server?: DomainsItem | null;

  network?: DomainsNetworkField | null;
}

export interface DomainsItem {
  uniqueIpCount?: number | null;

  domainName?: string | null;

  firstSeen?: Date | null;

  lastSeen?: Date | null;
}

export interface DomainsNetworkField {
  bytes?: number | null;

  packets?: number | null;

  transport?: string | null;

  direction?: NetworkDirectionEcs[] | null;
}

export interface FirstLastSeenDomain {
  firstSeen?: Date | null;

  lastSeen?: Date | null;
}

export interface TlsData {
  edges: TlsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface TlsEdges {
  node: TlsNode;

  cursor: CursorType;
}

export interface TlsNode {
  _id?: string | null;

  timestamp?: Date | null;

  alternativeNames?: string[] | null;

  notAfter?: string[] | null;

  commonNames?: string[] | null;

  ja3?: string[] | null;

  issuerNames?: string[] | null;
}

export interface UsersData {
  edges: UsersEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface UsersEdges {
  node: UsersNode;

  cursor: CursorType;
}

export interface UsersNode {
  _id?: string | null;

  timestamp?: Date | null;

  user?: UsersItem | null;
}

export interface UsersItem {
  name?: string | null;

  id?: ToStringArray | null;

  groupId?: ToStringArray | null;

  groupName?: ToStringArray | null;

  count?: number | null;
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

export interface KpiHostsData {
  hosts?: number | null;

  hostsHistogram?: KpiHostHistogramData[] | null;

  authSuccess?: number | null;

  authSuccessHistogram?: KpiHostHistogramData[] | null;

  authFailure?: number | null;

  authFailureHistogram?: KpiHostHistogramData[] | null;

  uniqueSourceIps?: number | null;

  uniqueSourceIpsHistogram?: KpiHostHistogramData[] | null;

  uniqueDestinationIps?: number | null;

  uniqueDestinationIpsHistogram?: KpiHostHistogramData[] | null;
}

export interface KpiHostHistogramData {
  key?: number | null;

  key_as_string?: string | null;

  count?: Count | null;
}

export interface Count {
  value?: number | null;

  doc_count?: number | null;
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
  auditbeatAuditd?: number | null;

  auditbeatFIM?: number | null;

  auditbeatLogin?: number | null;

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

  hosts: HostEcsFields[];

  user?: UserEcsFields | null;
}

export interface SayMyName {
  /** The id of the source */
  appName: string;
}

export interface OsFields {
  platform?: string | null;

  name?: string | null;

  full?: string | null;

  family?: string | null;

  version?: string | null;

  kernel?: string | null;
}

export interface HostFields {
  architecture?: string | null;

  id?: string | null;

  ip?: (string | null)[] | null;

  mac?: (string | null)[] | null;

  name?: string | null;

  os?: OsFields | null;

  type?: string | null;
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

export interface LastTimeDetails {
  hostName?: string | null;

  ip?: string | null;
}

export interface HostsSortField {
  field: HostsFields;

  direction: Direction;
}

export interface DomainsSortField {
  field: DomainsFields;

  direction: Direction;
}

export interface TlsSortField {
  field: TlsFields;

  direction: Direction;
}

export interface UsersSortField {
  field: UsersFields;

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
export interface LastEventTimeSourceArgs {
  id?: string | null;

  indexKey: LastEventIndexKey;

  details: LastTimeDetails;
}
export interface HostsSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  pagination: PaginationInput;

  sort: HostsSortField;

  filterQuery?: string | null;
}
export interface HostOverviewSourceArgs {
  id?: string | null;

  hostName: string;

  timerange: TimerangeInput;
}
export interface HostFirstLastSeenSourceArgs {
  id?: string | null;

  hostName: string;
}
export interface IpOverviewSourceArgs {
  id?: string | null;

  filterQuery?: string | null;

  ip: string;
}
export interface DomainsSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  ip: string;

  pagination: PaginationInput;

  sort: DomainsSortField;

  flowDirection: FlowDirection;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;
}
export interface DomainFirstLastSeenSourceArgs {
  id?: string | null;

  ip: string;

  domainName: string;

  flowTarget: FlowTarget;
}
export interface TlsSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  ip: string;

  pagination: PaginationInput;

  sort: TlsSortField;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;
}
export interface UsersSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  ip: string;

  pagination: PaginationInput;

  sort: UsersSortField;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;
}
export interface KpiNetworkSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;
}
export interface KpiHostsSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;
}
export interface NetworkTopNFlowSourceArgs {
  id?: string | null;

  filterQuery?: string | null;

  flowDirection: FlowDirection;

  flowTarget: FlowTarget;

  pagination: PaginationInput;

  sort: NetworkTopNFlowSortField;

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
  WINLOGBEAT = 'WINLOGBEAT',
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export enum LastEventIndexKey {
  hostDetails = 'hostDetails',
  hosts = 'hosts',
  ipDetails = 'ipDetails',
  network = 'network',
}

export enum HostsFields {
  hostName = 'hostName',
  lastSeen = 'lastSeen',
}

export enum DomainsFields {
  domainName = 'domainName',
  direction = 'direction',
  bytes = 'bytes',
  packets = 'packets',
  uniqueIpCount = 'uniqueIpCount',
}

export enum FlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}

export enum FlowTarget {
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

export enum TlsFields {
  _id = '_id',
}

export enum UsersFields {
  name = 'name',
  count = 'count',
}

export enum NetworkTopNFlowFields {
  bytes = 'bytes',
  packets = 'packets',
  ipCount = 'ipCount',
}

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut',
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

    name?: ToStringArray | null;
  };

  export type LastSuccess = {
    __typename?: 'LastSourceHost';

    timestamp?: Date | null;

    source?: _Source | null;

    host?: Host | null;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    ip?: ToStringArray | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: ToStringArray | null;

    name?: ToStringArray | null;
  };

  export type LastFailure = {
    __typename?: 'LastSourceHost';

    timestamp?: Date | null;

    source?: __Source | null;

    host?: _Host | null;
  };

  export type __Source = {
    __typename?: 'SourceEcsFields';

    ip?: ToStringArray | null;
  };

  export type _Host = {
    __typename?: 'HostEcsFields';

    id?: ToStringArray | null;

    name?: ToStringArray | null;
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

export namespace GetDomainFirstLastSeenQuery {
  export type Variables = {
    sourceId: string;
    ip: string;
    domainName: string;
    flowTarget: FlowTarget;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    DomainFirstLastSeen: DomainFirstLastSeen;
  };

  export type DomainFirstLastSeen = {
    __typename?: 'FirstLastSeenDomain';

    firstSeen?: Date | null;

    lastSeen?: Date | null;
  };
}

export namespace GetDomainsQuery {
  export type Variables = {
    sourceId: string;
    filterQuery?: string | null;
    flowDirection: FlowDirection;
    flowTarget: FlowTarget;
    ip: string;
    pagination: PaginationInput;
    sort: DomainsSortField;
    timerange: TimerangeInput;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Domains: Domains;
  };

  export type Domains = {
    __typename?: 'DomainsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'DomainsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'DomainsNode';

    source?: _Source | null;

    destination?: Destination | null;

    network?: Network | null;
  };

  export type _Source = {
    __typename?: 'DomainsItem';

    uniqueIpCount?: number | null;

    domainName?: string | null;

    firstSeen?: Date | null;

    lastSeen?: Date | null;
  };

  export type Destination = {
    __typename?: 'DomainsItem';

    uniqueIpCount?: number | null;

    domainName?: string | null;

    firstSeen?: Date | null;

    lastSeen?: Date | null;
  };

  export type Network = {
    __typename?: 'DomainsNetworkField';

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

    message?: ToStringArray | null;

    source?: _Source | null;

    destination?: Destination | null;

    suricata?: Suricata | null;

    user?: User | null;

    zeek?: Zeek | null;
  };

  export type Event = {
    __typename?: 'EventEcsFields';

    action?: ToStringArray | null;

    category?: ToStringArray | null;

    dataset?: ToStringArray | null;

    id?: ToStringArray | null;

    module?: ToStringArray | null;

    severity?: ToNumberArray | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    name?: ToStringArray | null;

    ip?: ToStringArray | null;

    id?: ToStringArray | null;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    ip?: ToStringArray | null;

    port?: ToNumberArray | null;
  };

  export type Destination = {
    __typename?: 'DestinationEcsFields';

    ip?: ToStringArray | null;

    port?: ToNumberArray | null;
  };

  export type Suricata = {
    __typename?: 'SuricataEcsFields';

    eve?: Eve | null;
  };

  export type Eve = {
    __typename?: 'SuricataEveData';

    proto?: ToStringArray | null;

    flow_id?: ToNumberArray | null;

    alert?: Alert | null;
  };

  export type Alert = {
    __typename?: 'SuricataAlertData';

    signature?: ToStringArray | null;

    signature_id?: ToNumberArray | null;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    name?: ToStringArray | null;
  };

  export type Zeek = {
    __typename?: 'ZeekEcsFields';

    session_id?: ToStringArray | null;
  };
}

export namespace GetLastEventTimeQuery {
  export type Variables = {
    sourceId: string;
    indexKey: LastEventIndexKey;
    details: LastTimeDetails;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    LastEventTime: LastEventTime;
  };

  export type LastEventTime = {
    __typename?: 'LastEventTimeData';

    lastSeen?: Date | null;
  };
}

export namespace GetHostFirstLastSeenQuery {
  export type Variables = {
    sourceId: string;
    hostName: string;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    HostFirstLastSeen: HostFirstLastSeen;
  };

  export type HostFirstLastSeen = {
    __typename?: 'FirstLastSeenHost';

    firstSeen?: Date | null;

    lastSeen?: Date | null;
  };
}

export namespace GetHostsTableQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInput;
    sort: HostsSortField;
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

    lastSeen?: Date | null;

    host?: Host | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: ToStringArray | null;

    name?: ToStringArray | null;

    os?: Os | null;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    name?: ToStringArray | null;

    version?: ToStringArray | null;
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

export namespace GetHostOverviewQuery {
  export type Variables = {
    sourceId: string;
    hostName: string;
    timerange: TimerangeInput;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    HostOverview: HostOverview;
  };

  export type HostOverview = {
    __typename?: 'HostItem';

    _id?: string | null;

    host?: Host | null;

    cloud?: Cloud | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    architecture?: ToStringArray | null;

    id?: ToStringArray | null;

    ip?: ToStringArray | null;

    mac?: ToStringArray | null;

    name?: ToStringArray | null;

    os?: Os | null;

    type?: ToStringArray | null;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    family?: ToStringArray | null;

    name?: ToStringArray | null;

    platform?: ToStringArray | null;

    version?: ToStringArray | null;
  };

  export type Cloud = {
    __typename?: 'CloudFields';

    instance?: Instance | null;

    machine?: Machine | null;

    provider?: (string | null)[] | null;

    region?: (string | null)[] | null;
  };

  export type Instance = {
    __typename?: 'CloudInstance';

    id?: (string | null)[] | null;
  };

  export type Machine = {
    __typename?: 'CloudMachine';

    type?: (string | null)[] | null;
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

    continent_name?: ToStringArray | null;

    city_name?: ToStringArray | null;

    country_iso_code?: ToStringArray | null;

    country_name?: ToStringArray | null;

    location?: Location | null;

    region_iso_code?: ToStringArray | null;

    region_name?: ToStringArray | null;
  };

  export type Location = {
    __typename?: 'Location';

    lat?: ToNumberArray | null;

    lon?: ToNumberArray | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    architecture?: ToStringArray | null;

    id?: ToStringArray | null;

    ip?: ToStringArray | null;

    mac?: ToStringArray | null;

    name?: ToStringArray | null;

    os?: Os | null;

    type?: ToStringArray | null;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    family?: ToStringArray | null;

    name?: ToStringArray | null;

    platform?: ToStringArray | null;

    version?: ToStringArray | null;
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

    continent_name?: ToStringArray | null;

    city_name?: ToStringArray | null;

    country_iso_code?: ToStringArray | null;

    country_name?: ToStringArray | null;

    location?: _Location | null;

    region_iso_code?: ToStringArray | null;

    region_name?: ToStringArray | null;
  };

  export type _Location = {
    __typename?: 'Location';

    lat?: ToNumberArray | null;

    lon?: ToNumberArray | null;
  };

  export type _Host = {
    __typename?: 'HostEcsFields';

    architecture?: ToStringArray | null;

    id?: ToStringArray | null;

    ip?: ToStringArray | null;

    mac?: ToStringArray | null;

    name?: ToStringArray | null;

    os?: _Os | null;

    type?: ToStringArray | null;
  };

  export type _Os = {
    __typename?: 'OsEcsFields';

    family?: ToStringArray | null;

    name?: ToStringArray | null;

    platform?: ToStringArray | null;

    version?: ToStringArray | null;
  };
}

export namespace GetKpiHostsQuery {
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

    KpiHosts: KpiHosts;
  };

  export type KpiHosts = {
    __typename?: 'KpiHostsData';

    hosts?: number | null;

    hostsHistogram?: HostsHistogram[] | null;

    authSuccess?: number | null;

    authSuccessHistogram?: AuthSuccessHistogram[] | null;

    authFailure?: number | null;

    authFailureHistogram?: AuthFailureHistogram[] | null;

    uniqueSourceIps?: number | null;

    uniqueSourceIpsHistogram?: UniqueSourceIpsHistogram[] | null;

    uniqueDestinationIps?: number | null;

    uniqueDestinationIpsHistogram?: UniqueDestinationIpsHistogram[] | null;
  };

  export type HostsHistogram = ChartFields.Fragment;

  export type AuthSuccessHistogram = ChartFields.Fragment;

  export type AuthFailureHistogram = ChartFields.Fragment;

  export type UniqueSourceIpsHistogram = ChartFields.Fragment;

  export type UniqueDestinationIpsHistogram = ChartFields.Fragment;
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
    flowDirection: FlowDirection;
    filterQuery?: string | null;
    pagination: PaginationInput;
    sort: NetworkTopNFlowSortField;
    flowTarget: FlowTarget;
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

    auditbeatAuditd?: number | null;

    auditbeatFIM?: number | null;

    auditbeatLogin?: number | null;

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

    winlogbeatAlias: string;
  };

  export type Status = {
    __typename?: 'SourceStatus';

    auditbeatIndicesExist: boolean;

    auditbeatAliasExists: boolean;

    auditbeatIndices: string[];

    filebeatIndicesExist: boolean;

    filebeatAliasExists: boolean;

    filebeatIndices: string[];

    winlogbeatIndicesExist: boolean;

    winlogbeatAliasExists: boolean;

    winlogbeatIndices: string[];

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

    message?: ToStringArray | null;

    system?: System | null;

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

  export type System = {
    __typename?: 'SystemEcsField';

    auth?: Auth | null;

    audit?: Audit | null;
  };

  export type Auth = {
    __typename?: 'AuthEcsFields';

    ssh?: Ssh | null;
  };

  export type Ssh = {
    __typename?: 'SshEcsFields';

    signature?: ToStringArray | null;

    method?: ToStringArray | null;
  };

  export type Audit = {
    __typename?: 'AuditEcsFields';

    package?: Package | null;
  };

  export type Package = {
    __typename?: 'PackageEcsFields';

    arch?: ToStringArray | null;

    entity_id?: ToStringArray | null;

    name?: ToStringArray | null;

    size?: ToNumberArray | null;

    summary?: ToStringArray | null;

    version?: ToStringArray | null;
  };

  export type Event = {
    __typename?: 'EventEcsFields';

    action?: ToStringArray | null;

    category?: ToStringArray | null;

    created?: ToDateArray | null;

    dataset?: ToStringArray | null;

    duration?: ToNumberArray | null;

    end?: ToDateArray | null;

    hash?: ToStringArray | null;

    id?: ToStringArray | null;

    kind?: ToStringArray | null;

    module?: ToStringArray | null;

    original?: ToStringArray | null;

    outcome?: ToStringArray | null;

    risk_score?: ToNumberArray | null;

    risk_score_norm?: ToNumberArray | null;

    severity?: ToNumberArray | null;

    start?: ToDateArray | null;

    timezone?: ToStringArray | null;

    type?: ToStringArray | null;
  };

  export type Auditd = {
    __typename?: 'AuditdEcsFields';

    result?: ToStringArray | null;

    session?: ToStringArray | null;

    data?: _Data | null;

    summary?: Summary | null;
  };

  export type _Data = {
    __typename?: 'AuditdData';

    acct?: ToStringArray | null;

    terminal?: ToStringArray | null;

    op?: ToStringArray | null;
  };

  export type Summary = {
    __typename?: 'Summary';

    actor?: Actor | null;

    object?: Object | null;

    how?: ToStringArray | null;

    message_type?: ToStringArray | null;

    sequence?: ToStringArray | null;
  };

  export type Actor = {
    __typename?: 'PrimarySecondary';

    primary?: ToStringArray | null;

    secondary?: ToStringArray | null;
  };

  export type Object = {
    __typename?: 'PrimarySecondary';

    primary?: ToStringArray | null;

    secondary?: ToStringArray | null;

    type?: ToStringArray | null;
  };

  export type File = {
    __typename?: 'FileFields';

    path?: ToStringArray | null;

    target_path?: ToStringArray | null;

    extension?: ToStringArray | null;

    type?: ToStringArray | null;

    device?: ToStringArray | null;

    inode?: ToStringArray | null;

    uid?: ToStringArray | null;

    owner?: ToStringArray | null;

    gid?: ToStringArray | null;

    group?: ToStringArray | null;

    mode?: ToStringArray | null;

    size?: ToNumberArray | null;

    mtime?: ToDateArray | null;

    ctime?: ToDateArray | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: ToStringArray | null;

    name?: ToStringArray | null;

    ip?: ToStringArray | null;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    bytes?: ToNumberArray | null;

    ip?: ToStringArray | null;

    packets?: ToNumberArray | null;

    port?: ToNumberArray | null;

    geo?: Geo | null;
  };

  export type Geo = {
    __typename?: 'GeoEcsFields';

    continent_name?: ToStringArray | null;

    country_name?: ToStringArray | null;

    country_iso_code?: ToStringArray | null;

    city_name?: ToStringArray | null;

    region_iso_code?: ToStringArray | null;

    region_name?: ToStringArray | null;
  };

  export type Destination = {
    __typename?: 'DestinationEcsFields';

    bytes?: ToNumberArray | null;

    ip?: ToStringArray | null;

    packets?: ToNumberArray | null;

    port?: ToNumberArray | null;

    geo?: _Geo | null;
  };

  export type _Geo = {
    __typename?: 'GeoEcsFields';

    continent_name?: ToStringArray | null;

    country_name?: ToStringArray | null;

    country_iso_code?: ToStringArray | null;

    city_name?: ToStringArray | null;

    region_iso_code?: ToStringArray | null;

    region_name?: ToStringArray | null;
  };

  export type __Geo = {
    __typename?: 'GeoEcsFields';

    region_name?: ToStringArray | null;

    country_iso_code?: ToStringArray | null;
  };

  export type Suricata = {
    __typename?: 'SuricataEcsFields';

    eve?: Eve | null;
  };

  export type Eve = {
    __typename?: 'SuricataEveData';

    proto?: ToStringArray | null;

    flow_id?: ToNumberArray | null;

    alert?: Alert | null;
  };

  export type Alert = {
    __typename?: 'SuricataAlertData';

    signature?: ToStringArray | null;

    signature_id?: ToNumberArray | null;
  };

  export type Network = {
    __typename?: 'NetworkEcsField';

    bytes?: ToNumberArray | null;

    community_id?: ToStringArray | null;

    direction?: ToStringArray | null;

    packets?: ToNumberArray | null;

    protocol?: ToStringArray | null;

    transport?: ToStringArray | null;
  };

  export type Http = {
    __typename?: 'HttpEcsFields';

    version?: ToStringArray | null;

    request?: Request | null;

    response?: Response | null;
  };

  export type Request = {
    __typename?: 'HttpRequestData';

    method?: ToStringArray | null;

    body?: Body | null;

    referrer?: ToStringArray | null;
  };

  export type Body = {
    __typename?: 'HttpBodyData';

    bytes?: ToNumberArray | null;

    content?: ToStringArray | null;
  };

  export type Response = {
    __typename?: 'HttpResponseData';

    status_code?: ToNumberArray | null;

    body?: _Body | null;
  };

  export type _Body = {
    __typename?: 'HttpBodyData';

    bytes?: ToNumberArray | null;

    content?: ToStringArray | null;
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

    sha1?: ToStringArray | null;
  };

  export type Fingerprints = {
    __typename?: 'TlsFingerprintsData';

    ja3?: Ja3 | null;
  };

  export type Ja3 = {
    __typename?: 'TlsJa3Data';

    hash?: ToStringArray | null;
  };

  export type ServerCertificate = {
    __typename?: 'TlsServerCertificateData';

    fingerprint?: _Fingerprint | null;
  };

  export type _Fingerprint = {
    __typename?: 'FingerprintData';

    sha1?: ToStringArray | null;
  };

  export type Url = {
    __typename?: 'UrlEcsFields';

    original?: ToStringArray | null;

    domain?: ToStringArray | null;

    username?: ToStringArray | null;

    password?: ToStringArray | null;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    name?: ToStringArray | null;
  };

  export type Process = {
    __typename?: 'ProcessEcsFields';

    pid?: ToNumberArray | null;

    name?: ToStringArray | null;

    ppid?: ToNumberArray | null;

    args?: ToStringArray | null;

    executable?: ToStringArray | null;

    title?: ToStringArray | null;

    working_directory?: ToStringArray | null;
  };

  export type Zeek = {
    __typename?: 'ZeekEcsFields';

    session_id?: ToStringArray | null;

    connection?: Connection | null;

    notice?: Notice | null;

    dns?: Dns | null;

    http?: _Http | null;

    files?: Files | null;

    ssl?: Ssl | null;
  };

  export type Connection = {
    __typename?: 'ZeekConnectionData';

    local_resp?: ToBooleanArray | null;

    local_orig?: ToBooleanArray | null;

    missed_bytes?: ToNumberArray | null;

    state?: ToStringArray | null;

    history?: ToStringArray | null;
  };

  export type Notice = {
    __typename?: 'ZeekNoticeData';

    suppress_for?: ToNumberArray | null;

    msg?: ToStringArray | null;

    note?: ToStringArray | null;

    sub?: ToStringArray | null;

    dst?: ToStringArray | null;

    dropped?: ToBooleanArray | null;

    peer_descr?: ToStringArray | null;
  };

  export type Dns = {
    __typename?: 'ZeekDnsData';

    AA?: ToBooleanArray | null;

    qclass_name?: ToStringArray | null;

    RD?: ToBooleanArray | null;

    qtype_name?: ToStringArray | null;

    rejected?: ToBooleanArray | null;

    qtype?: ToStringArray | null;

    query?: ToStringArray | null;

    trans_id?: ToNumberArray | null;

    qclass?: ToStringArray | null;

    RA?: ToBooleanArray | null;

    TC?: ToBooleanArray | null;
  };

  export type _Http = {
    __typename?: 'ZeekHttpData';

    resp_mime_types?: ToStringArray | null;

    trans_depth?: ToStringArray | null;

    status_msg?: ToStringArray | null;

    resp_fuids?: ToStringArray | null;

    tags?: ToStringArray | null;
  };

  export type Files = {
    __typename?: 'ZeekFileData';

    session_ids?: ToStringArray | null;

    timedout?: ToBooleanArray | null;

    local_orig?: ToBooleanArray | null;

    tx_host?: ToStringArray | null;

    source?: ToStringArray | null;

    is_orig?: ToBooleanArray | null;

    overflow_bytes?: ToNumberArray | null;

    sha1?: ToStringArray | null;

    duration?: ToNumberArray | null;

    depth?: ToNumberArray | null;

    analyzers?: ToStringArray | null;

    mime_type?: ToStringArray | null;

    rx_host?: ToStringArray | null;

    total_bytes?: ToNumberArray | null;

    fuid?: ToStringArray | null;

    seen_bytes?: ToNumberArray | null;

    missing_bytes?: ToNumberArray | null;

    md5?: ToStringArray | null;
  };

  export type Ssl = {
    __typename?: 'ZeekSslData';

    cipher?: ToStringArray | null;

    established?: ToBooleanArray | null;

    resumed?: ToBooleanArray | null;

    version?: ToStringArray | null;
  };
}

export namespace GetTlsQuery {
  export type Variables = {
    sourceId: string;
    filterQuery?: string | null;
    flowTarget: FlowTarget;
    ip: string;
    pagination: PaginationInput;
    sort: TlsSortField;
    timerange: TimerangeInput;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Tls: Tls;
  };

  export type Tls = {
    __typename?: 'TlsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'TlsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'TlsNode';

    _id?: string | null;

    alternativeNames?: string[] | null;

    commonNames?: string[] | null;

    ja3?: string[] | null;

    issuerNames?: string[] | null;

    notAfter?: string[] | null;
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

    hosts: Hosts[];
  };

  export type Process = {
    __typename?: 'ProcessEcsFields';

    args?: ToStringArray | null;

    name?: ToStringArray | null;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    id?: ToStringArray | null;

    name?: ToStringArray | null;
  };

  export type Hosts = {
    __typename?: 'HostEcsFields';

    name?: ToStringArray | null;
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

export namespace GetUsersQuery {
  export type Variables = {
    sourceId: string;
    filterQuery?: string | null;
    flowTarget: FlowTarget;
    ip: string;
    pagination: PaginationInput;
    sort: UsersSortField;
    timerange: TimerangeInput;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Users: Users;
  };

  export type Users = {
    __typename?: 'UsersData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'UsersEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'UsersNode';

    user?: User | null;
  };

  export type User = {
    __typename?: 'UsersItem';

    name?: string | null;

    id?: ToStringArray | null;

    groupId?: ToStringArray | null;

    groupName?: ToStringArray | null;

    count?: number | null;
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

export namespace ChartFields {
  export type Fragment = {
    __typename?: 'KpiHostHistogramData';

    x?: string | null;

    y?: Y | null;
  };

  export type Y = {
    __typename?: 'Count';

    value?: number | null;

    doc_count?: number | null;
  };
}
