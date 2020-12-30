/* tslint:disable */
/* eslint-disable */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type Maybe<T> = T | null;

export interface PageInfoNote {
  pageIndex: number;

  pageSize: number;
}

export interface SortNote {
  sortField: SortFieldNote;

  sortOrder: Direction;
}

export interface TimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: string;
  /** The beginning of the timerange */
  from: string;
}

export interface PaginationInputPaginated {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: number;
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: number;
  /** The fakePossibleCount parameter determines the total count in order to show 5 additional pages */
  fakePossibleCount: number;
  /** The querySize parameter is the number of items to be returned */
  querySize: number;
}

export interface HostsSortField {
  field: HostsFields;

  direction: Direction;
}

export interface DocValueFieldsInput {
  field: string;

  format: string;
}

export interface PageInfoTimeline {
  pageIndex: number;

  pageSize: number;
}

export interface SortTimeline {
  sortField: SortFieldTimeline;

  sortOrder: Direction;
}

export interface NoteInput {
  eventId?: Maybe<string>;

  note?: Maybe<string>;

  timelineId?: Maybe<string>;
}

export interface TimelineInput {
  columns?: Maybe<ColumnHeaderInput[]>;

  dataProviders?: Maybe<DataProviderInput[]>;

  description?: Maybe<string>;

  eventType?: Maybe<string>;

  excludedRowRendererIds?: Maybe<RowRendererId[]>;

  filters?: Maybe<FilterTimelineInput[]>;

  kqlMode?: Maybe<string>;

  kqlQuery?: Maybe<SerializedFilterQueryInput>;

  indexNames?: Maybe<string[]>;

  title?: Maybe<string>;

  templateTimelineId?: Maybe<string>;

  templateTimelineVersion?: Maybe<number>;

  timelineType?: Maybe<TimelineType>;

  dateRange?: Maybe<DateRangePickerInput>;

  savedQueryId?: Maybe<string>;

  sort?: Maybe<SortTimelineInput[]>;

  status?: Maybe<TimelineStatus>;
}

export interface ColumnHeaderInput {
  aggregatable?: Maybe<boolean>;

  category?: Maybe<string>;

  columnHeaderType?: Maybe<string>;

  description?: Maybe<string>;

  example?: Maybe<string>;

  indexes?: Maybe<string[]>;

  id?: Maybe<string>;

  name?: Maybe<string>;

  placeholder?: Maybe<string>;

  searchable?: Maybe<boolean>;

  type?: Maybe<string>;
}

export interface DataProviderInput {
  id?: Maybe<string>;

  name?: Maybe<string>;

  enabled?: Maybe<boolean>;

  excluded?: Maybe<boolean>;

  kqlQuery?: Maybe<string>;

  queryMatch?: Maybe<QueryMatchInput>;

  and?: Maybe<DataProviderInput[]>;

  type?: Maybe<DataProviderType>;
}

export interface QueryMatchInput {
  field?: Maybe<string>;

  displayField?: Maybe<string>;

  value?: Maybe<string>;

  displayValue?: Maybe<string>;

  operator?: Maybe<string>;
}

export interface FilterTimelineInput {
  exists?: Maybe<string>;

  meta?: Maybe<FilterMetaTimelineInput>;

  match_all?: Maybe<string>;

  missing?: Maybe<string>;

  query?: Maybe<string>;

  range?: Maybe<string>;

  script?: Maybe<string>;
}

export interface FilterMetaTimelineInput {
  alias?: Maybe<string>;

  controlledBy?: Maybe<string>;

  disabled?: Maybe<boolean>;

  field?: Maybe<string>;

  formattedValue?: Maybe<string>;

  index?: Maybe<string>;

  key?: Maybe<string>;

  negate?: Maybe<boolean>;

  params?: Maybe<string>;

  type?: Maybe<string>;

  value?: Maybe<string>;
}

export interface SerializedFilterQueryInput {
  filterQuery?: Maybe<SerializedKueryQueryInput>;
}

export interface SerializedKueryQueryInput {
  kuery?: Maybe<KueryFilterQueryInput>;

  serializedQuery?: Maybe<string>;
}

export interface KueryFilterQueryInput {
  kind?: Maybe<string>;

  expression?: Maybe<string>;
}

export interface DateRangePickerInput {
  start?: Maybe<ToAny>;

  end?: Maybe<ToAny>;
}

export interface SortTimelineInput {
  columnId?: Maybe<string>;

  sortDirection?: Maybe<string>;
}

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: Maybe<string>;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: Maybe<string>;
}

export interface SortField {
  sortFieldId: string;

  direction: Direction;
}

export interface FavoriteTimelineInput {
  fullName?: Maybe<string>;

  userName?: Maybe<string>;

  favoriteDate?: Maybe<number>;
}

export enum SortFieldNote {
  updatedBy = 'updatedBy',
  updated = 'updated',
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export enum HostsFields {
  hostName = 'hostName',
  lastSeen = 'lastSeen',
}

export enum HostPolicyResponseActionStatus {
  success = 'success',
  failure = 'failure',
  warning = 'warning',
}

export enum TimelineType {
  default = 'default',
  template = 'template',
}

export enum DataProviderType {
  default = 'default',
  template = 'template',
}

export enum RowRendererId {
  auditd = 'auditd',
  auditd_file = 'auditd_file',
  netflow = 'netflow',
  plain = 'plain',
  suricata = 'suricata',
  system = 'system',
  system_dns = 'system_dns',
  system_endgame_process = 'system_endgame_process',
  system_file = 'system_file',
  system_fim = 'system_fim',
  system_security_event = 'system_security_event',
  system_socket = 'system_socket',
  zeek = 'zeek',
}

export enum TimelineStatus {
  active = 'active',
  draft = 'draft',
  immutable = 'immutable',
}

export enum SortFieldTimeline {
  title = 'title',
  description = 'description',
  updated = 'updated',
  created = 'created',
}

export enum FlowTarget {
  client = 'client',
  destination = 'destination',
  server = 'server',
  source = 'source',
}

export enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}

export enum FlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}

export type ToStringArray = string[];

export type Date = string;

export type ToAny = any;

export type ToStringArrayNoNullable = any;

export type ToDateArray = string[];

export type ToNumberArray = number[];

export type ToBooleanArray = boolean[];

export type ToIFieldSubTypeNonNullable = any;

// ====================================================
// Scalars
// ====================================================

// ====================================================
// Types
// ====================================================

export interface Query {
  getNote: NoteResult;

  getNotesByTimelineId: NoteResult[];

  getNotesByEventId: NoteResult[];

  getAllNotes: ResponseNotes;

  getAllPinnedEventsByTimelineId: PinnedEvent[];
  /** Get a security data source by id */
  source: Source;
  /** Get a list of all security data sources */
  allSources: Source[];

  getOneTimeline: TimelineResult;

  getAllTimeline: ResponseTimelines;
}

export interface NoteResult {
  eventId?: Maybe<string>;

  note?: Maybe<string>;

  timelineId?: Maybe<string>;

  noteId: string;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  timelineVersion?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version?: Maybe<string>;
}

export interface ResponseNotes {
  notes: NoteResult[];

  totalCount?: Maybe<number>;
}

export interface PinnedEvent {
  code?: Maybe<number>;

  message?: Maybe<string>;

  pinnedEventId: string;

  eventId?: Maybe<string>;

  timelineId?: Maybe<string>;

  timelineVersion?: Maybe<string>;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version?: Maybe<string>;
}

export interface Source {
  /** The id of the source */
  id: string;
  /** The raw configuration of the source */
  configuration: SourceConfiguration;
  /** The status of the source */
  status: SourceStatus;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;

  HostOverview: HostItem;

  HostFirstLastSeen: FirstLastSeenHost;
}

/** A set of configuration options for a security data source */
export interface SourceConfiguration {
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
  /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
  indicesExist: boolean;
  /** The list of fields defined in the index mappings */
  indexFields: string[];
}

export interface HostsData {
  edges: HostsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface HostsEdges {
  node: HostItem;

  cursor: CursorType;
}

export interface HostItem {
  _id?: Maybe<string>;

  agent?: Maybe<AgentFields>;

  cloud?: Maybe<CloudFields>;

  endpoint?: Maybe<EndpointFields>;

  host?: Maybe<HostEcsFields>;

  inspect?: Maybe<Inspect>;

  lastSeen?: Maybe<string>;
}

export interface AgentFields {
  id?: Maybe<string>;
}

export interface CloudFields {
  instance?: Maybe<CloudInstance>;

  machine?: Maybe<CloudMachine>;

  provider?: Maybe<(Maybe<string>)[]>;

  region?: Maybe<(Maybe<string>)[]>;
}

export interface CloudInstance {
  id?: Maybe<(Maybe<string>)[]>;
}

export interface CloudMachine {
  type?: Maybe<(Maybe<string>)[]>;
}

export interface EndpointFields {
  endpointPolicy?: Maybe<string>;

  sensorVersion?: Maybe<string>;

  policyStatus?: Maybe<HostPolicyResponseActionStatus>;
}

export interface HostEcsFields {
  architecture?: Maybe<string[]>;

  id?: Maybe<string[]>;

  ip?: Maybe<string[]>;

  mac?: Maybe<string[]>;

  name?: Maybe<string[]>;

  os?: Maybe<OsEcsFields>;

  type?: Maybe<string[]>;
}

export interface OsEcsFields {
  platform?: Maybe<string[]>;

  name?: Maybe<string[]>;

  full?: Maybe<string[]>;

  family?: Maybe<string[]>;

  version?: Maybe<string[]>;

  kernel?: Maybe<string[]>;
}

export interface Inspect {
  dsl: string[];

  response: string[];
}

export interface CursorType {
  value?: Maybe<string>;

  tiebreaker?: Maybe<string>;
}

export interface PageInfoPaginated {
  activePage: number;

  fakeTotalCount: number;

  showMorePagesIndicator: boolean;
}

export interface FirstLastSeenHost {
  inspect?: Maybe<Inspect>;

  firstSeen?: Maybe<string>;

  lastSeen?: Maybe<string>;
}

export interface TimelineResult {
  columns?: Maybe<ColumnHeaderResult[]>;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  dataProviders?: Maybe<DataProviderResult[]>;

  dateRange?: Maybe<DateRangePickerResult>;

  description?: Maybe<string>;

  eventIdToNoteIds?: Maybe<NoteResult[]>;

  eventType?: Maybe<string>;

  excludedRowRendererIds?: Maybe<RowRendererId[]>;

  favorite?: Maybe<FavoriteTimelineResult[]>;

  filters?: Maybe<FilterTimelineResult[]>;

  kqlMode?: Maybe<string>;

  kqlQuery?: Maybe<SerializedFilterQueryResult>;

  indexNames?: Maybe<string[]>;

  notes?: Maybe<NoteResult[]>;

  noteIds?: Maybe<string[]>;

  pinnedEventIds?: Maybe<string[]>;

  pinnedEventsSaveObject?: Maybe<PinnedEvent[]>;

  savedQueryId?: Maybe<string>;

  savedObjectId: string;

  sort?: Maybe<ToAny>;

  status?: Maybe<TimelineStatus>;

  title?: Maybe<string>;

  templateTimelineId?: Maybe<string>;

  templateTimelineVersion?: Maybe<number>;

  timelineType?: Maybe<TimelineType>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version: string;
}

export interface ColumnHeaderResult {
  aggregatable?: Maybe<boolean>;

  category?: Maybe<string>;

  columnHeaderType?: Maybe<string>;

  description?: Maybe<string>;

  example?: Maybe<string>;

  indexes?: Maybe<string[]>;

  id?: Maybe<string>;

  name?: Maybe<string>;

  placeholder?: Maybe<string>;

  searchable?: Maybe<boolean>;

  type?: Maybe<string>;
}

export interface DataProviderResult {
  id?: Maybe<string>;

  name?: Maybe<string>;

  enabled?: Maybe<boolean>;

  excluded?: Maybe<boolean>;

  kqlQuery?: Maybe<string>;

  queryMatch?: Maybe<QueryMatchResult>;

  type?: Maybe<DataProviderType>;

  and?: Maybe<DataProviderResult[]>;
}

export interface QueryMatchResult {
  field?: Maybe<string>;

  displayField?: Maybe<string>;

  value?: Maybe<string>;

  displayValue?: Maybe<string>;

  operator?: Maybe<string>;
}

export interface DateRangePickerResult {
  start?: Maybe<ToAny>;

  end?: Maybe<ToAny>;
}

export interface FavoriteTimelineResult {
  fullName?: Maybe<string>;

  userName?: Maybe<string>;

  favoriteDate?: Maybe<number>;
}

export interface FilterTimelineResult {
  exists?: Maybe<string>;

  meta?: Maybe<FilterMetaTimelineResult>;

  match_all?: Maybe<string>;

  missing?: Maybe<string>;

  query?: Maybe<string>;

  range?: Maybe<string>;

  script?: Maybe<string>;
}

export interface FilterMetaTimelineResult {
  alias?: Maybe<string>;

  controlledBy?: Maybe<string>;

  disabled?: Maybe<boolean>;

  field?: Maybe<string>;

  formattedValue?: Maybe<string>;

  index?: Maybe<string>;

  key?: Maybe<string>;

  negate?: Maybe<boolean>;

  params?: Maybe<string>;

  type?: Maybe<string>;

  value?: Maybe<string>;
}

export interface SerializedFilterQueryResult {
  filterQuery?: Maybe<SerializedKueryQueryResult>;
}

export interface SerializedKueryQueryResult {
  kuery?: Maybe<KueryFilterQueryResult>;

  serializedQuery?: Maybe<string>;
}

export interface KueryFilterQueryResult {
  kind?: Maybe<string>;

  expression?: Maybe<string>;
}

export interface ResponseTimelines {
  timeline: (Maybe<TimelineResult>)[];

  totalCount?: Maybe<number>;

  defaultTimelineCount?: Maybe<number>;

  templateTimelineCount?: Maybe<number>;

  elasticTemplateTimelineCount?: Maybe<number>;

  customTemplateTimelineCount?: Maybe<number>;

  favoriteCount?: Maybe<number>;
}

export interface Mutation {
  /** Persists a note */
  persistNote: ResponseNote;

  deleteNote?: Maybe<boolean>;

  deleteNoteByTimelineId?: Maybe<boolean>;
  /** Persists a pinned event in a timeline */
  persistPinnedEventOnTimeline?: Maybe<PinnedEvent>;
  /** Remove a pinned events in a timeline */
  deletePinnedEventOnTimeline: boolean;
  /** Remove all pinned events in a timeline */
  deleteAllPinnedEventsOnTimeline: boolean;
  /** Persists a timeline */
  persistTimeline: ResponseTimeline;

  persistFavorite: ResponseFavoriteTimeline;

  deleteTimeline: boolean;
}

export interface ResponseNote {
  code?: Maybe<number>;

  message?: Maybe<string>;

  note: NoteResult;
}

export interface ResponseTimeline {
  code?: Maybe<number>;

  message?: Maybe<string>;

  timeline: TimelineResult;
}

export interface ResponseFavoriteTimeline {
  code?: Maybe<number>;

  message?: Maybe<string>;

  savedObjectId: string;

  version: string;

  favorite?: Maybe<FavoriteTimelineResult[]>;
}

export interface EventEcsFields {
  action?: Maybe<string[]>;

  category?: Maybe<string[]>;

  code?: Maybe<string[]>;

  created?: Maybe<string[]>;

  dataset?: Maybe<string[]>;

  duration?: Maybe<number[]>;

  end?: Maybe<string[]>;

  hash?: Maybe<string[]>;

  id?: Maybe<string[]>;

  kind?: Maybe<string[]>;

  module?: Maybe<string[]>;

  original?: Maybe<string[]>;

  outcome?: Maybe<string[]>;

  risk_score?: Maybe<number[]>;

  risk_score_norm?: Maybe<number[]>;

  severity?: Maybe<number[]>;

  start?: Maybe<string[]>;

  timezone?: Maybe<string[]>;

  type?: Maybe<string[]>;
}

export interface Location {
  lon?: Maybe<number[]>;

  lat?: Maybe<number[]>;
}

export interface GeoEcsFields {
  city_name?: Maybe<string[]>;

  continent_name?: Maybe<string[]>;

  country_iso_code?: Maybe<string[]>;

  country_name?: Maybe<string[]>;

  location?: Maybe<Location>;

  region_iso_code?: Maybe<string[]>;

  region_name?: Maybe<string[]>;
}

export interface PrimarySecondary {
  primary?: Maybe<string[]>;

  secondary?: Maybe<string[]>;

  type?: Maybe<string[]>;
}

export interface Summary {
  actor?: Maybe<PrimarySecondary>;

  object?: Maybe<PrimarySecondary>;

  how?: Maybe<string[]>;

  message_type?: Maybe<string[]>;

  sequence?: Maybe<string[]>;
}

export interface AgentEcsField {
  type?: Maybe<string[]>;
}

export interface AuditdData {
  acct?: Maybe<string[]>;

  terminal?: Maybe<string[]>;

  op?: Maybe<string[]>;
}

export interface AuditdEcsFields {
  result?: Maybe<string[]>;

  session?: Maybe<string[]>;

  data?: Maybe<AuditdData>;

  summary?: Maybe<Summary>;

  sequence?: Maybe<string[]>;
}

export interface Thread {
  id?: Maybe<number[]>;

  start?: Maybe<string[]>;
}

export interface ProcessHashData {
  md5?: Maybe<string[]>;

  sha1?: Maybe<string[]>;

  sha256?: Maybe<string[]>;
}

export interface ProcessEcsFields {
  hash?: Maybe<ProcessHashData>;

  pid?: Maybe<number[]>;

  name?: Maybe<string[]>;

  ppid?: Maybe<number[]>;

  args?: Maybe<string[]>;

  entity_id?: Maybe<string[]>;

  executable?: Maybe<string[]>;

  title?: Maybe<string[]>;

  thread?: Maybe<Thread>;

  working_directory?: Maybe<string[]>;
}

export interface SourceEcsFields {
  bytes?: Maybe<number[]>;

  ip?: Maybe<string[]>;

  port?: Maybe<number[]>;

  domain?: Maybe<string[]>;

  geo?: Maybe<GeoEcsFields>;

  packets?: Maybe<number[]>;
}

export interface DestinationEcsFields {
  bytes?: Maybe<number[]>;

  ip?: Maybe<string[]>;

  port?: Maybe<number[]>;

  domain?: Maybe<string[]>;

  geo?: Maybe<GeoEcsFields>;

  packets?: Maybe<number[]>;
}

export interface DnsQuestionData {
  name?: Maybe<string[]>;

  type?: Maybe<string[]>;
}

export interface DnsEcsFields {
  question?: Maybe<DnsQuestionData>;

  resolved_ip?: Maybe<string[]>;

  response_code?: Maybe<string[]>;
}

export interface EndgameEcsFields {
  exit_code?: Maybe<number[]>;

  file_name?: Maybe<string[]>;

  file_path?: Maybe<string[]>;

  logon_type?: Maybe<number[]>;

  parent_process_name?: Maybe<string[]>;

  pid?: Maybe<number[]>;

  process_name?: Maybe<string[]>;

  subject_domain_name?: Maybe<string[]>;

  subject_logon_id?: Maybe<string[]>;

  subject_user_name?: Maybe<string[]>;

  target_domain_name?: Maybe<string[]>;

  target_logon_id?: Maybe<string[]>;

  target_user_name?: Maybe<string[]>;
}

export interface SuricataAlertData {
  signature?: Maybe<string[]>;

  signature_id?: Maybe<number[]>;
}

export interface SuricataEveData {
  alert?: Maybe<SuricataAlertData>;

  flow_id?: Maybe<number[]>;

  proto?: Maybe<string[]>;
}

export interface SuricataEcsFields {
  eve?: Maybe<SuricataEveData>;
}

export interface TlsJa3Data {
  hash?: Maybe<string[]>;
}

export interface FingerprintData {
  sha1?: Maybe<string[]>;
}

export interface TlsClientCertificateData {
  fingerprint?: Maybe<FingerprintData>;
}

export interface TlsServerCertificateData {
  fingerprint?: Maybe<FingerprintData>;
}

export interface TlsFingerprintsData {
  ja3?: Maybe<TlsJa3Data>;
}

export interface TlsEcsFields {
  client_certificate?: Maybe<TlsClientCertificateData>;

  fingerprints?: Maybe<TlsFingerprintsData>;

  server_certificate?: Maybe<TlsServerCertificateData>;
}

export interface ZeekConnectionData {
  local_resp?: Maybe<boolean[]>;

  local_orig?: Maybe<boolean[]>;

  missed_bytes?: Maybe<number[]>;

  state?: Maybe<string[]>;

  history?: Maybe<string[]>;
}

export interface ZeekNoticeData {
  suppress_for?: Maybe<number[]>;

  msg?: Maybe<string[]>;

  note?: Maybe<string[]>;

  sub?: Maybe<string[]>;

  dst?: Maybe<string[]>;

  dropped?: Maybe<boolean[]>;

  peer_descr?: Maybe<string[]>;
}

export interface ZeekDnsData {
  AA?: Maybe<boolean[]>;

  qclass_name?: Maybe<string[]>;

  RD?: Maybe<boolean[]>;

  qtype_name?: Maybe<string[]>;

  rejected?: Maybe<boolean[]>;

  qtype?: Maybe<string[]>;

  query?: Maybe<string[]>;

  trans_id?: Maybe<number[]>;

  qclass?: Maybe<string[]>;

  RA?: Maybe<boolean[]>;

  TC?: Maybe<boolean[]>;
}

export interface FileFields {
  name?: Maybe<string[]>;

  path?: Maybe<string[]>;

  target_path?: Maybe<string[]>;

  extension?: Maybe<string[]>;

  type?: Maybe<string[]>;

  device?: Maybe<string[]>;

  inode?: Maybe<string[]>;

  uid?: Maybe<string[]>;

  owner?: Maybe<string[]>;

  gid?: Maybe<string[]>;

  group?: Maybe<string[]>;

  mode?: Maybe<string[]>;

  size?: Maybe<number[]>;

  mtime?: Maybe<string[]>;

  ctime?: Maybe<string[]>;
}

export interface ZeekHttpData {
  resp_mime_types?: Maybe<string[]>;

  trans_depth?: Maybe<string[]>;

  status_msg?: Maybe<string[]>;

  resp_fuids?: Maybe<string[]>;

  tags?: Maybe<string[]>;
}

export interface HttpBodyData {
  content?: Maybe<string[]>;

  bytes?: Maybe<number[]>;
}

export interface HttpRequestData {
  method?: Maybe<string[]>;

  body?: Maybe<HttpBodyData>;

  referrer?: Maybe<string[]>;

  bytes?: Maybe<number[]>;
}

export interface HttpResponseData {
  status_code?: Maybe<number[]>;

  body?: Maybe<HttpBodyData>;

  bytes?: Maybe<number[]>;
}

export interface HttpEcsFields {
  version?: Maybe<string[]>;

  request?: Maybe<HttpRequestData>;

  response?: Maybe<HttpResponseData>;
}

export interface UrlEcsFields {
  domain?: Maybe<string[]>;

  original?: Maybe<string[]>;

  username?: Maybe<string[]>;

  password?: Maybe<string[]>;
}

export interface ZeekFileData {
  session_ids?: Maybe<string[]>;

  timedout?: Maybe<boolean[]>;

  local_orig?: Maybe<boolean[]>;

  tx_host?: Maybe<string[]>;

  source?: Maybe<string[]>;

  is_orig?: Maybe<boolean[]>;

  overflow_bytes?: Maybe<number[]>;

  sha1?: Maybe<string[]>;

  duration?: Maybe<number[]>;

  depth?: Maybe<number[]>;

  analyzers?: Maybe<string[]>;

  mime_type?: Maybe<string[]>;

  rx_host?: Maybe<string[]>;

  total_bytes?: Maybe<number[]>;

  fuid?: Maybe<string[]>;

  seen_bytes?: Maybe<number[]>;

  missing_bytes?: Maybe<number[]>;

  md5?: Maybe<string[]>;
}

export interface ZeekSslData {
  cipher?: Maybe<string[]>;

  established?: Maybe<boolean[]>;

  resumed?: Maybe<boolean[]>;

  version?: Maybe<string[]>;
}

export interface ZeekEcsFields {
  session_id?: Maybe<string[]>;

  connection?: Maybe<ZeekConnectionData>;

  notice?: Maybe<ZeekNoticeData>;

  dns?: Maybe<ZeekDnsData>;

  http?: Maybe<ZeekHttpData>;

  files?: Maybe<ZeekFileData>;

  ssl?: Maybe<ZeekSslData>;
}

export interface UserEcsFields {
  domain?: Maybe<string[]>;

  id?: Maybe<string[]>;

  name?: Maybe<string[]>;

  full_name?: Maybe<string[]>;

  email?: Maybe<string[]>;

  hash?: Maybe<string[]>;

  group?: Maybe<string[]>;
}

export interface WinlogEcsFields {
  event_id?: Maybe<number[]>;
}

export interface NetworkEcsField {
  bytes?: Maybe<number[]>;

  community_id?: Maybe<string[]>;

  direction?: Maybe<string[]>;

  packets?: Maybe<number[]>;

  protocol?: Maybe<string[]>;

  transport?: Maybe<string[]>;
}

export interface PackageEcsFields {
  arch?: Maybe<string[]>;

  entity_id?: Maybe<string[]>;

  name?: Maybe<string[]>;

  size?: Maybe<number[]>;

  summary?: Maybe<string[]>;

  version?: Maybe<string[]>;
}

export interface AuditEcsFields {
  package?: Maybe<PackageEcsFields>;
}

export interface SshEcsFields {
  method?: Maybe<string[]>;

  signature?: Maybe<string[]>;
}

export interface AuthEcsFields {
  ssh?: Maybe<SshEcsFields>;
}

export interface SystemEcsField {
  audit?: Maybe<AuditEcsFields>;

  auth?: Maybe<AuthEcsFields>;
}

export interface RuleField {
  id?: Maybe<string[]>;

  rule_id?: Maybe<string[]>;

  false_positives: string[];

  saved_id?: Maybe<string[]>;

  timeline_id?: Maybe<string[]>;

  timeline_title?: Maybe<string[]>;

  max_signals?: Maybe<number[]>;

  risk_score?: Maybe<string[]>;

  output_index?: Maybe<string[]>;

  description?: Maybe<string[]>;

  from?: Maybe<string[]>;

  immutable?: Maybe<boolean[]>;

  index?: Maybe<string[]>;

  interval?: Maybe<string[]>;

  language?: Maybe<string[]>;

  query?: Maybe<string[]>;

  references?: Maybe<string[]>;

  severity?: Maybe<string[]>;

  tags?: Maybe<string[]>;

  threat?: Maybe<ToAny>;

  type?: Maybe<string[]>;

  size?: Maybe<string[]>;

  to?: Maybe<string[]>;

  enabled?: Maybe<boolean[]>;

  filters?: Maybe<ToAny>;

  created_at?: Maybe<string[]>;

  updated_at?: Maybe<string[]>;

  created_by?: Maybe<string[]>;

  updated_by?: Maybe<string[]>;

  version?: Maybe<string[]>;

  note?: Maybe<string[]>;

  threshold?: Maybe<ToAny>;

  exceptions_list?: Maybe<ToAny>;
}

export interface SignalField {
  rule?: Maybe<RuleField>;

  original_time?: Maybe<string[]>;

  status?: Maybe<string[]>;
}

export interface RuleEcsField {
  reference?: Maybe<string[]>;
}

export interface Ecs {
  _id: string;

  _index?: Maybe<string>;

  agent?: Maybe<AgentEcsField>;

  auditd?: Maybe<AuditdEcsFields>;

  destination?: Maybe<DestinationEcsFields>;

  dns?: Maybe<DnsEcsFields>;

  endgame?: Maybe<EndgameEcsFields>;

  event?: Maybe<EventEcsFields>;

  geo?: Maybe<GeoEcsFields>;

  host?: Maybe<HostEcsFields>;

  network?: Maybe<NetworkEcsField>;

  rule?: Maybe<RuleEcsField>;

  signal?: Maybe<SignalField>;

  source?: Maybe<SourceEcsFields>;

  suricata?: Maybe<SuricataEcsFields>;

  tls?: Maybe<TlsEcsFields>;

  zeek?: Maybe<ZeekEcsFields>;

  http?: Maybe<HttpEcsFields>;

  url?: Maybe<UrlEcsFields>;

  timestamp?: Maybe<string>;

  message?: Maybe<string[]>;

  user?: Maybe<UserEcsFields>;

  winlog?: Maybe<WinlogEcsFields>;

  process?: Maybe<ProcessEcsFields>;

  file?: Maybe<FileFields>;

  system?: Maybe<SystemEcsField>;
}

export interface EcsEdges {
  node: Ecs;

  cursor: CursorType;
}

export interface OsFields {
  platform?: Maybe<string>;

  name?: Maybe<string>;

  full?: Maybe<string>;

  family?: Maybe<string>;

  version?: Maybe<string>;

  kernel?: Maybe<string>;
}

export interface HostFields {
  architecture?: Maybe<string>;

  id?: Maybe<string>;

  ip?: Maybe<(Maybe<string>)[]>;

  mac?: Maybe<(Maybe<string>)[]>;

  name?: Maybe<string>;

  os?: Maybe<OsFields>;

  type?: Maybe<string>;
}

/** A descriptor of a field in an index */
export interface IndexField {
  /** Where the field belong */
  category: string;
  /** Example of field's value */
  example?: Maybe<string>;
  /** whether the field's belong to an alias index */
  indexes: (Maybe<string>)[];
  /** The name of the field */
  name: string;
  /** The type of the field's values as recognized by Kibana */
  type: string;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
  /** Description of the field */
  description?: Maybe<string>;

  format?: Maybe<string>;
  /** the elastic type as mapped in the index */
  esTypes?: Maybe<ToStringArrayNoNullable>;

  subType?: Maybe<ToIFieldSubTypeNonNullable>;
}

export interface PageInfo {
  endCursor?: Maybe<CursorType>;

  hasNextPage?: Maybe<boolean>;
}

// ====================================================
// Arguments
// ====================================================

export interface GetNoteQueryArgs {
  id: string;
}
export interface GetNotesByTimelineIdQueryArgs {
  timelineId: string;
}
export interface GetNotesByEventIdQueryArgs {
  eventId: string;
}
export interface GetAllNotesQueryArgs {
  pageInfo?: Maybe<PageInfoNote>;

  search?: Maybe<string>;

  sort?: Maybe<SortNote>;
}
export interface GetAllPinnedEventsByTimelineIdQueryArgs {
  timelineId: string;
}
export interface SourceQueryArgs {
  /** The id of the source */
  id: string;
}
export interface GetOneTimelineQueryArgs {
  id: string;

  timelineType?: Maybe<TimelineType>;
}
export interface GetAllTimelineQueryArgs {
  pageInfo: PageInfoTimeline;

  search?: Maybe<string>;

  sort?: Maybe<SortTimeline>;

  onlyUserFavorite?: Maybe<boolean>;

  timelineType?: Maybe<TimelineType>;

  status?: Maybe<TimelineStatus>;
}
export interface HostsSourceArgs {
  id?: Maybe<string>;

  timerange: TimerangeInput;

  pagination: PaginationInputPaginated;

  sort: HostsSortField;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];

  docValueFields: DocValueFieldsInput[];
}
export interface HostOverviewSourceArgs {
  id?: Maybe<string>;

  hostName: string;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface HostFirstLastSeenSourceArgs {
  id?: Maybe<string>;

  hostName: string;

  defaultIndex: string[];

  docValueFields: DocValueFieldsInput[];
}
export interface IndicesExistSourceStatusArgs {
  defaultIndex: string[];
}
export interface IndexFieldsSourceStatusArgs {
  defaultIndex: string[];
}
export interface PersistNoteMutationArgs {
  noteId?: Maybe<string>;

  version?: Maybe<string>;

  note: NoteInput;
}
export interface DeleteNoteMutationArgs {
  id: string[];
}
export interface DeleteNoteByTimelineIdMutationArgs {
  timelineId: string;

  version?: Maybe<string>;
}
export interface PersistPinnedEventOnTimelineMutationArgs {
  pinnedEventId?: Maybe<string>;

  eventId: string;

  timelineId?: Maybe<string>;
}
export interface DeletePinnedEventOnTimelineMutationArgs {
  id: string[];
}
export interface DeleteAllPinnedEventsOnTimelineMutationArgs {
  timelineId: string;
}
export interface PersistTimelineMutationArgs {
  id?: Maybe<string>;

  version?: Maybe<string>;

  timeline: TimelineInput;
}
export interface PersistFavoriteMutationArgs {
  timelineId?: Maybe<string>;
}
export interface DeleteTimelineMutationArgs {
  id: string[];
}

// ====================================================
// Documents
// ====================================================

export namespace GetHostOverviewQuery {
  export type Variables = {
    sourceId: string;
    hostName: string;
    timerange: TimerangeInput;
    defaultIndex: string[];
    inspect: boolean;
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

    _id: Maybe<string>;

    agent: Maybe<Agent>;

    host: Maybe<Host>;

    cloud: Maybe<Cloud>;

    inspect: Maybe<Inspect>;

    endpoint: Maybe<Endpoint>;
  };

  export type Agent = {
    __typename?: 'AgentFields';

    id: Maybe<string>;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    architecture: Maybe<string[]>;

    id: Maybe<string[]>;

    ip: Maybe<string[]>;

    mac: Maybe<string[]>;

    name: Maybe<string[]>;

    os: Maybe<Os>;

    type: Maybe<string[]>;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    family: Maybe<string[]>;

    name: Maybe<string[]>;

    platform: Maybe<string[]>;

    version: Maybe<string[]>;
  };

  export type Cloud = {
    __typename?: 'CloudFields';

    instance: Maybe<Instance>;

    machine: Maybe<Machine>;

    provider: Maybe<(Maybe<string>)[]>;

    region: Maybe<(Maybe<string>)[]>;
  };

  export type Instance = {
    __typename?: 'CloudInstance';

    id: Maybe<(Maybe<string>)[]>;
  };

  export type Machine = {
    __typename?: 'CloudMachine';

    type: Maybe<(Maybe<string>)[]>;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };

  export type Endpoint = {
    __typename?: 'EndpointFields';

    endpointPolicy: Maybe<string>;

    policyStatus: Maybe<HostPolicyResponseActionStatus>;

    sensorVersion: Maybe<string>;
  };
}

export namespace GetHostFirstLastSeenQuery {
  export type Variables = {
    sourceId: string;
    hostName: string;
    defaultIndex: string[];
    docValueFields: DocValueFieldsInput[];
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

    firstSeen: Maybe<string>;

    lastSeen: Maybe<string>;
  };
}

export namespace GetHostsTableQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInputPaginated;
    sort: HostsSortField;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
    docValueFields: DocValueFieldsInput[];
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

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'HostsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'HostItem';

    _id: Maybe<string>;

    lastSeen: Maybe<string>;

    host: Maybe<Host>;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id: Maybe<string[]>;

    name: Maybe<string[]>;

    os: Maybe<Os>;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    name: Maybe<string[]>;

    version: Maybe<string[]>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetAllTimeline {
  export type Variables = {
    pageInfo: PageInfoTimeline;
    search?: Maybe<string>;
    sort?: Maybe<SortTimeline>;
    onlyUserFavorite?: Maybe<boolean>;
    timelineType?: Maybe<TimelineType>;
    status?: Maybe<TimelineStatus>;
  };

  export type Query = {
    __typename?: 'Query';

    getAllTimeline: GetAllTimeline;
  };

  export type GetAllTimeline = {
    __typename?: 'ResponseTimelines';

    totalCount: Maybe<number>;

    defaultTimelineCount: Maybe<number>;

    templateTimelineCount: Maybe<number>;

    elasticTemplateTimelineCount: Maybe<number>;

    customTemplateTimelineCount: Maybe<number>;

    favoriteCount: Maybe<number>;

    timeline: (Maybe<Timeline>)[];
  };

  export type Timeline = {
    __typename?: 'TimelineResult';

    savedObjectId: string;

    description: Maybe<string>;

    favorite: Maybe<Favorite[]>;

    eventIdToNoteIds: Maybe<EventIdToNoteIds[]>;

    excludedRowRendererIds: Maybe<RowRendererId[]>;

    notes: Maybe<Notes[]>;

    noteIds: Maybe<string[]>;

    pinnedEventIds: Maybe<string[]>;

    status: Maybe<TimelineStatus>;

    title: Maybe<string>;

    timelineType: Maybe<TimelineType>;

    templateTimelineId: Maybe<string>;

    templateTimelineVersion: Maybe<number>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: string;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };

  export type EventIdToNoteIds = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    timelineVersion: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };

  export type Notes = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };
}

export namespace DeleteTimelineMutation {
  export type Variables = {
    id: string[];
  };

  export type Mutation = {
    __typename?: 'Mutation';

    deleteTimeline: boolean;
  };
}

export namespace PersistTimelineFavoriteMutation {
  export type Variables = {
    timelineId?: Maybe<string>;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistFavorite: PersistFavorite;
  };

  export type PersistFavorite = {
    __typename?: 'ResponseFavoriteTimeline';

    savedObjectId: string;

    version: string;

    favorite: Maybe<Favorite[]>;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };
}

export namespace PersistTimelineNoteMutation {
  export type Variables = {
    noteId?: Maybe<string>;
    version?: Maybe<string>;
    note: NoteInput;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistNote: PersistNote;
  };

  export type PersistNote = {
    __typename?: 'ResponseNote';

    code: Maybe<number>;

    message: Maybe<string>;

    note: Note;
  };

  export type Note = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };
}

export namespace GetOneTimeline {
  export type Variables = {
    id: string;
    timelineType?: Maybe<TimelineType>;
  };

  export type Query = {
    __typename?: 'Query';

    getOneTimeline: GetOneTimeline;
  };

  export type GetOneTimeline = {
    __typename?: 'TimelineResult';

    savedObjectId: string;

    columns: Maybe<Columns[]>;

    dataProviders: Maybe<DataProviders[]>;

    dateRange: Maybe<DateRange>;

    description: Maybe<string>;

    eventType: Maybe<string>;

    eventIdToNoteIds: Maybe<EventIdToNoteIds[]>;

    excludedRowRendererIds: Maybe<RowRendererId[]>;

    favorite: Maybe<Favorite[]>;

    filters: Maybe<Filters[]>;

    kqlMode: Maybe<string>;

    kqlQuery: Maybe<KqlQuery>;

    indexNames: Maybe<string[]>;

    notes: Maybe<Notes[]>;

    noteIds: Maybe<string[]>;

    pinnedEventIds: Maybe<string[]>;

    pinnedEventsSaveObject: Maybe<PinnedEventsSaveObject[]>;

    status: Maybe<TimelineStatus>;

    title: Maybe<string>;

    timelineType: Maybe<TimelineType>;

    templateTimelineId: Maybe<string>;

    templateTimelineVersion: Maybe<number>;

    savedQueryId: Maybe<string>;

    sort: Maybe<ToAny>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: string;
  };

  export type Columns = {
    __typename?: 'ColumnHeaderResult';

    aggregatable: Maybe<boolean>;

    category: Maybe<string>;

    columnHeaderType: Maybe<string>;

    description: Maybe<string>;

    example: Maybe<string>;

    indexes: Maybe<string[]>;

    id: Maybe<string>;

    name: Maybe<string>;

    searchable: Maybe<boolean>;

    type: Maybe<string>;
  };

  export type DataProviders = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    type: Maybe<DataProviderType>;

    queryMatch: Maybe<QueryMatch>;

    and: Maybe<And[]>;
  };

  export type QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type And = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    type: Maybe<DataProviderType>;

    queryMatch: Maybe<_QueryMatch>;
  };

  export type _QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type DateRange = {
    __typename?: 'DateRangePickerResult';

    start: Maybe<ToAny>;

    end: Maybe<ToAny>;
  };

  export type EventIdToNoteIds = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    timelineVersion: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };

  export type Filters = {
    __typename?: 'FilterTimelineResult';

    meta: Maybe<Meta>;

    query: Maybe<string>;

    exists: Maybe<string>;

    match_all: Maybe<string>;

    missing: Maybe<string>;

    range: Maybe<string>;

    script: Maybe<string>;
  };

  export type Meta = {
    __typename?: 'FilterMetaTimelineResult';

    alias: Maybe<string>;

    controlledBy: Maybe<string>;

    disabled: Maybe<boolean>;

    field: Maybe<string>;

    formattedValue: Maybe<string>;

    index: Maybe<string>;

    key: Maybe<string>;

    negate: Maybe<boolean>;

    params: Maybe<string>;

    type: Maybe<string>;

    value: Maybe<string>;
  };

  export type KqlQuery = {
    __typename?: 'SerializedFilterQueryResult';

    filterQuery: Maybe<FilterQuery>;
  };

  export type FilterQuery = {
    __typename?: 'SerializedKueryQueryResult';

    kuery: Maybe<Kuery>;

    serializedQuery: Maybe<string>;
  };

  export type Kuery = {
    __typename?: 'KueryFilterQueryResult';

    kind: Maybe<string>;

    expression: Maybe<string>;
  };

  export type Notes = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };

  export type PinnedEventsSaveObject = {
    __typename?: 'PinnedEvent';

    pinnedEventId: string;

    eventId: Maybe<string>;

    timelineId: Maybe<string>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };
}

export namespace PersistTimelineMutation {
  export type Variables = {
    timelineId?: Maybe<string>;
    version?: Maybe<string>;
    timeline: TimelineInput;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistTimeline: PersistTimeline;
  };

  export type PersistTimeline = {
    __typename?: 'ResponseTimeline';

    code: Maybe<number>;

    message: Maybe<string>;

    timeline: Timeline;
  };

  export type Timeline = {
    __typename?: 'TimelineResult';

    savedObjectId: string;

    version: string;

    columns: Maybe<Columns[]>;

    dataProviders: Maybe<DataProviders[]>;

    description: Maybe<string>;

    eventType: Maybe<string>;

    excludedRowRendererIds: Maybe<RowRendererId[]>;

    favorite: Maybe<Favorite[]>;

    filters: Maybe<Filters[]>;

    kqlMode: Maybe<string>;

    kqlQuery: Maybe<KqlQuery>;

    indexNames: Maybe<string[]>;

    title: Maybe<string>;

    dateRange: Maybe<DateRange>;

    savedQueryId: Maybe<string>;

    sort: Maybe<ToAny>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;
  };

  export type Columns = {
    __typename?: 'ColumnHeaderResult';

    aggregatable: Maybe<boolean>;

    category: Maybe<string>;

    columnHeaderType: Maybe<string>;

    description: Maybe<string>;

    example: Maybe<string>;

    indexes: Maybe<string[]>;

    id: Maybe<string>;

    name: Maybe<string>;

    searchable: Maybe<boolean>;

    type: Maybe<string>;
  };

  export type DataProviders = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    type: Maybe<DataProviderType>;

    queryMatch: Maybe<QueryMatch>;

    and: Maybe<And[]>;
  };

  export type QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type And = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    type: Maybe<DataProviderType>;

    queryMatch: Maybe<_QueryMatch>;
  };

  export type _QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };

  export type Filters = {
    __typename?: 'FilterTimelineResult';

    meta: Maybe<Meta>;

    query: Maybe<string>;

    exists: Maybe<string>;

    match_all: Maybe<string>;

    missing: Maybe<string>;

    range: Maybe<string>;

    script: Maybe<string>;
  };

  export type Meta = {
    __typename?: 'FilterMetaTimelineResult';

    alias: Maybe<string>;

    controlledBy: Maybe<string>;

    disabled: Maybe<boolean>;

    field: Maybe<string>;

    formattedValue: Maybe<string>;

    index: Maybe<string>;

    key: Maybe<string>;

    negate: Maybe<boolean>;

    params: Maybe<string>;

    type: Maybe<string>;

    value: Maybe<string>;
  };

  export type KqlQuery = {
    __typename?: 'SerializedFilterQueryResult';

    filterQuery: Maybe<FilterQuery>;
  };

  export type FilterQuery = {
    __typename?: 'SerializedKueryQueryResult';

    kuery: Maybe<Kuery>;

    serializedQuery: Maybe<string>;
  };

  export type Kuery = {
    __typename?: 'KueryFilterQueryResult';

    kind: Maybe<string>;

    expression: Maybe<string>;
  };

  export type DateRange = {
    __typename?: 'DateRangePickerResult';

    start: Maybe<ToAny>;

    end: Maybe<ToAny>;
  };
}

export namespace PersistTimelinePinnedEventMutation {
  export type Variables = {
    pinnedEventId?: Maybe<string>;
    eventId: string;
    timelineId?: Maybe<string>;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistPinnedEventOnTimeline: Maybe<PersistPinnedEventOnTimeline>;
  };

  export type PersistPinnedEventOnTimeline = {
    __typename?: 'PinnedEvent';

    pinnedEventId: string;

    eventId: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };
}
