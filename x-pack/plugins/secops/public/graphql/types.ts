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
  /** Gets Authorization success and failures based on a timerange */
  Authorizations: AuthorizationsData;
  /** Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Events: EventsData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;
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

export interface AuthorizationsData {
  edges: AuthorizationsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface AuthorizationsEdges {
  authorization: AuthorizationItem;

  cursor: CursorType;
}

export interface AuthorizationItem {
  _id: string;

  failures: number;

  successes: number;

  user: string;

  from: string;

  latest: string;

  to: HostEcsFields;
}

export interface HostEcsFields {
  id?: string | null;

  ip?: string | null;

  name?: string | null;
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
  event: Ecs;

  cursor: CursorType;
}

export interface Ecs {
  _id?: string | null;

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
}

export interface EventEcsFields {
  category?: string | null;

  id?: number | null;

  module?: string | null;

  severity?: number | null;

  type?: string | null;
}

export interface GeoEcsFields {
  country_iso_code?: string | null;

  region_name?: string | null;
}

export interface SourceEcsFields {
  ip?: string | null;

  port?: number | null;
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

export interface UserEcsFields {
  id?: number | null;

  name?: string | null;
}

export interface HostsData {
  edges: HostsEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface HostsEdges {
  host: HostItem;

  cursor: CursorType;
}

export interface HostItem {
  _id?: string | null;

  name?: string | null;

  firstSeen?: string | null;

  version?: string | null;

  os?: string | null;

  hostId?: string | null;
}

export interface UncommonProcessesData {
  edges: UncommonProcessesEdges[];

  totalCount: number;

  pageInfo: PageInfo;
}

export interface UncommonProcessesEdges {
  uncommonProcess: UncommonProcessItem;

  cursor: CursorType;
}

export interface UncommonProcessItem {
  _id: string;

  name: string;

  title?: string | null;

  instances: number;

  hosts: HostEcsFields[];
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
export interface AuthorizationsSourceArgs {
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
  indexType?: IndexType | null;
}

// ====================================================
// Enums
// ====================================================

export enum IndexType {
  ANY = 'ANY',
  LOGS = 'LOGS',
  AUDITBEAT = 'AUDITBEAT',
}

export enum Direction {
  ascending = 'ascending',
  descending = 'descending',
}

// ====================================================
// END: Typescript template
// ====================================================

// ====================================================
// Documents
// ====================================================

export namespace GetAuthorizationsQuery {
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

    Authorizations: Authorizations;
  };

  export type Authorizations = {
    __typename?: 'AuthorizationsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;
  };

  export type Edges = {
    __typename?: 'AuthorizationsEdges';

    authorization: Authorization;

    cursor: Cursor;
  };

  export type Authorization = {
    __typename?: 'AuthorizationItem';

    _id: string;

    failures: number;

    successes: number;

    user: string;

    from: string;

    to: To;

    latest: string;
  };

  export type To = {
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

    event: Event;
  };

  export type Event = {
    __typename?: 'ECS';

    _id?: string | null;

    _index?: string | null;

    timestamp?: string | null;

    event?: _Event | null;

    host?: Host | null;

    source?: _Source | null;

    destination?: Destination | null;

    geo?: Geo | null;

    suricata?: Suricata | null;
  };

  export type _Event = {
    __typename?: 'EventEcsFields';

    type?: string | null;

    severity?: number | null;

    module?: string | null;

    category?: string | null;

    id?: number | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    name?: string | null;

    ip?: string | null;

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
}

export namespace GetHostsQuery {
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

    host: Host;

    cursor: Cursor;
  };

  export type Host = {
    __typename?: 'HostItem';

    _id?: string | null;

    name?: string | null;

    os?: string | null;

    version?: string | null;

    firstSeen?: string | null;

    hostId?: string | null;
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

    value: string;

    count: number;
  };
}

export namespace SourceQuery {
  export type Variables = {
    sourceId?: string | null;
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

    indexFields: IndexFields[];
  };

  export type IndexFields = {
    __typename?: 'IndexField';

    name: string;

    searchable: boolean;

    type: string;

    aggregatable: boolean;
  };
}

export namespace GetTimelineQuery {
  export type Variables = {
    sourceId: string;
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

    event: Event;
  };

  export type Event = {
    __typename?: 'ECS';

    _id?: string | null;

    _index?: string | null;

    timestamp?: string | null;

    event?: _Event | null;

    host?: Host | null;

    source?: _Source | null;

    destination?: Destination | null;

    geo?: Geo | null;

    suricata?: Suricata | null;
  };

  export type _Event = {
    __typename?: 'EventEcsFields';

    type?: string | null;

    severity?: number | null;

    module?: string | null;

    category?: string | null;

    id?: number | null;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id?: string | null;

    name?: string | null;

    ip?: string | null;
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

    uncommonProcess: UncommonProcess;

    cursor: Cursor;
  };

  export type UncommonProcess = {
    __typename?: 'UncommonProcessItem';

    _id: string;

    name: string;

    title?: string | null;

    instances: number;

    hosts: Hosts[];
  };

  export type Hosts = {
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
