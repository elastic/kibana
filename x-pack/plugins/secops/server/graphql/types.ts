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
  /** Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  getEvents?: EventsData | null;
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

export interface EventsData {
  kpiEventType: KpiItem[];

  events: EventItem[];
}

export interface KpiItem {
  value: string;

  count: number;
}

export interface EventItem {
  _id?: string | null;

  destination?: DestinationEcsFields | null;

  event?: EventEcsFields | null;

  geo?: GeoEcsFields | null;

  host?: HostEcsFields | null;

  source?: SourceEcsFields | null;

  suricata?: SuricataEcsFields | null;

  timestamp?: string | null;
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

export interface HostEcsFields {
  id?: string | null;

  hostname?: string | null;

  ip?: string | null;

  name?: string | null;
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
}

export interface CursorType {
  value: string;

  tiebreaker?: string | null;
}

export interface PageInfo {
  endCursor?: CursorType | null;

  hasNextPage?: boolean | null;
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

// ====================================================
// Arguments
// ====================================================

export interface SourceQueryArgs {
  /** The id of the source */
  id: string;
}
export interface GetEventsSourceArgs {
  timerange: TimerangeInput;

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
    /** Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    getEvents?: GetEventsResolver<EventsData | null, TypeParent, Context>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Hosts?: HostsResolver<HostsData, TypeParent, Context>;
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
  export type GetEventsResolver<
    R = EventsData | null,
    Parent = Source,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context, GetEventsArgs>;
  export interface GetEventsArgs {
    timerange: TimerangeInput;

    filterQuery?: string | null;
  }

  export type HostsResolver<R = HostsData, Parent = Source, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context,
    HostsArgs
  >;
  export interface HostsArgs {
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
    indexType?: IndexType | null;
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

export namespace EventsDataResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = EventsData> {
    kpiEventType?: KpiEventTypeResolver<KpiItem[], TypeParent, Context>;

    events?: EventsResolver<EventItem[], TypeParent, Context>;
  }

  export type KpiEventTypeResolver<
    R = KpiItem[],
    Parent = EventsData,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type EventsResolver<
    R = EventItem[],
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

export namespace EventItemResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = EventItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    destination?: DestinationResolver<DestinationEcsFields | null, TypeParent, Context>;

    event?: EventResolver<EventEcsFields | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;

    source?: SourceResolver<SourceEcsFields | null, TypeParent, Context>;

    suricata?: SuricataResolver<SuricataEcsFields | null, TypeParent, Context>;

    timestamp?: TimestampResolver<string | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = EventItem, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DestinationResolver<
    R = DestinationEcsFields | null,
    Parent = EventItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type EventResolver<
    R = EventEcsFields | null,
    Parent = EventItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<
    R = GeoEcsFields | null,
    Parent = EventItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = EventItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = SourceEcsFields | null,
    Parent = EventItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type SuricataResolver<
    R = SuricataEcsFields | null,
    Parent = EventItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string | null,
    Parent = EventItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace DestinationEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = DestinationEcsFields> {
    ip?: IpResolver<string | null, TypeParent, Context>;

    port?: PortResolver<number | null, TypeParent, Context>;
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
}

export namespace EventEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = EventEcsFields> {
    category?: CategoryResolver<string | null, TypeParent, Context>;

    id?: IdResolver<number | null, TypeParent, Context>;

    module?: ModuleResolver<string | null, TypeParent, Context>;

    severity?: SeverityResolver<number | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;
  }

  export type CategoryResolver<
    R = string | null,
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

export namespace HostEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = HostEcsFields> {
    id?: IdResolver<string | null, TypeParent, Context>;

    hostname?: HostnameResolver<string | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostnameResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = HostEcsFields,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
}

export namespace SourceEcsFieldsResolvers {
  export interface Resolvers<Context = SecOpsContext, TypeParent = SourceEcsFields> {
    ip?: IpResolver<string | null, TypeParent, Context>;

    port?: PortResolver<number | null, TypeParent, Context>;
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
    host?: HostResolver<HostItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type HostResolver<R = HostItem, Parent = HostsEdges, Context = SecOpsContext> = Resolver<
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

    name?: NameResolver<string | null, TypeParent, Context>;

    firstSeen?: FirstSeenResolver<string | null, TypeParent, Context>;

    version?: VersionResolver<string | null, TypeParent, Context>;

    os?: OsResolver<string | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = HostItem, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type NameResolver<
    R = string | null,
    Parent = HostItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type FirstSeenResolver<
    R = string | null,
    Parent = HostItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string | null,
    Parent = HostItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type OsResolver<R = string | null, Parent = HostItem, Context = SecOpsContext> = Resolver<
    R,
    Parent,
    Context
  >;
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
    uncommonProcess?: UncommonProcessResolver<UncommonProcessItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type UncommonProcessResolver<
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

    name?: NameResolver<string, TypeParent, Context>;

    title?: TitleResolver<string | null, TypeParent, Context>;

    instances?: InstancesResolver<number, TypeParent, Context>;

    hosts?: HostsResolver<HostEcsFields[], TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type TitleResolver<
    R = string | null,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type InstancesResolver<
    R = number,
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
  export type HostsResolver<
    R = HostEcsFields[],
    Parent = UncommonProcessItem,
    Context = SecOpsContext
  > = Resolver<R, Parent, Context>;
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
