/* tslint:disable */
/*
     * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
     * or more contributor license agreements. Licensed under the Elastic License;
     * you may not use this file except in compliance with the Elastic License.
     */

import { GraphQLResolveInfo } from 'graphql';

export type Resolver<Result, Parent = any, Context = any, Args = any> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export type SubscriptionResolver<Result, Parent = any, Context = any, Args = any> = {
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
};

export interface Query {
  source: Source /** Get a security data source by id */;
  allSources: Source[] /** Get a list of all security data sources */;
}

export interface Source {
  id: string /** The id of the source */;
  configuration: SourceConfiguration /** The raw configuration of the source */;
  getEvents?: EventsData | null /** Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */;
  whoAmI?: SayMyName | null /** Just a simple example to get the app name */;
}
/** A set of configuration options for a security data source */
export interface SourceConfiguration {
  fileAlias: string /** The alias to read file data from */;
  fields: SourceFields /** The field mapping to use for this source */;
}
/** A mapping of semantic fields to their document counterparts */
export interface SourceFields {
  container: string /** The field to identify a container by */;
  host: string /** The fields to identify a host by */;
  message: string[] /** The fields that may contain the log event message. The first field found win. */;
  pod: string /** The field to identify a pod by */;
  tiebreaker: string /** The field to use as a tiebreaker for log events that have identical timestamps */;
  timestamp: string /** The field to use as a timestamp for metrics and logs */;
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
  hostname?: string | null;
  ip?: string | null;
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

export interface SayMyName {
  appName: string /** The id of the source */;
}

export interface TimerangeInput {
  interval: string /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */;
  to: number /** The end of the timerange */;
  from: number /** The beginning of the timerange */;
}
export interface SourceQueryArgs {
  id: string /** The id of the source */;
}
export interface GetEventsSourceArgs {
  timerange: TimerangeInput;
  filterQuery?: string | null;
}

export namespace QueryResolvers {
  export interface Resolvers<Context = any> {
    source?: SourceResolver<Source, any, Context> /** Get a security data source by id */;
    allSources?: AllSourcesResolver<
      Source[],
      any,
      Context
    > /** Get a list of all security data sources */;
  }

  export type SourceResolver<R = Source, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context,
    SourceArgs
  >;
  export interface SourceArgs {
    id: string /** The id of the source */;
  }

  export type AllSourcesResolver<R = Source[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SourceResolvers {
  export interface Resolvers<Context = any> {
    id?: IdResolver<string, any, Context> /** The id of the source */;
    configuration?: ConfigurationResolver<
      SourceConfiguration,
      any,
      Context
    > /** The raw configuration of the source */;
    getEvents?: GetEventsResolver<
      EventsData | null,
      any,
      Context
    > /** Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */;
    whoAmI?: WhoAmIResolver<
      SayMyName | null,
      any,
      Context
    > /** Just a simple example to get the app name */;
  }

  export type IdResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type ConfigurationResolver<
    R = SourceConfiguration,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type GetEventsResolver<R = EventsData | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context,
    GetEventsArgs
  >;
  export interface GetEventsArgs {
    timerange: TimerangeInput;
    filterQuery?: string | null;
  }

  export type WhoAmIResolver<R = SayMyName | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}
/** A set of configuration options for a security data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers<Context = any> {
    fileAlias?: FileAliasResolver<string, any, Context> /** The alias to read file data from */;
    fields?: FieldsResolver<
      SourceFields,
      any,
      Context
    > /** The field mapping to use for this source */;
  }

  export type FileAliasResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FieldsResolver<R = SourceFields, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers<Context = any> {
    container?: ContainerResolver<string, any, Context> /** The field to identify a container by */;
    host?: HostResolver<string, any, Context> /** The fields to identify a host by */;
    message?: MessageResolver<
      string[],
      any,
      Context
    > /** The fields that may contain the log event message. The first field found win. */;
    pod?: PodResolver<string, any, Context> /** The field to identify a pod by */;
    tiebreaker?: TiebreakerResolver<
      string,
      any,
      Context
    > /** The field to use as a tiebreaker for log events that have identical timestamps */;
    timestamp?: TimestampResolver<
      string,
      any,
      Context
    > /** The field to use as a timestamp for metrics and logs */;
  }

  export type ContainerResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type HostResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type MessageResolver<R = string[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PodResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type TiebreakerResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TimestampResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EventsDataResolvers {
  export interface Resolvers<Context = any> {
    kpiEventType?: KpiEventTypeResolver<KpiItem[], any, Context>;
    events?: EventsResolver<EventItem[], any, Context>;
  }

  export type KpiEventTypeResolver<R = KpiItem[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type EventsResolver<R = EventItem[], Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace KpiItemResolvers {
  export interface Resolvers<Context = any> {
    value?: ValueResolver<string, any, Context>;
    count?: CountResolver<number, any, Context>;
  }

  export type ValueResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type CountResolver<R = number, Parent = any, Context = any> = Resolver<R, Parent, Context>;
}

export namespace EventItemResolvers {
  export interface Resolvers<Context = any> {
    destination?: DestinationResolver<DestinationEcsFields | null, any, Context>;
    event?: EventResolver<EventEcsFields | null, any, Context>;
    geo?: GeoResolver<GeoEcsFields | null, any, Context>;
    host?: HostResolver<HostEcsFields | null, any, Context>;
    source?: SourceResolver<SourceEcsFields | null, any, Context>;
    suricata?: SuricataResolver<SuricataEcsFields | null, any, Context>;
    timestamp?: TimestampResolver<string | null, any, Context>;
  }

  export type DestinationResolver<
    R = DestinationEcsFields | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type EventResolver<R = EventEcsFields | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type GeoResolver<R = GeoEcsFields | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type HostResolver<R = HostEcsFields | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SourceResolver<R = SourceEcsFields | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SuricataResolver<
    R = SuricataEcsFields | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace DestinationEcsFieldsResolvers {
  export interface Resolvers<Context = any> {
    ip?: IpResolver<string | null, any, Context>;
    port?: PortResolver<number | null, any, Context>;
  }

  export type IpResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PortResolver<R = number | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EventEcsFieldsResolvers {
  export interface Resolvers<Context = any> {
    category?: CategoryResolver<string | null, any, Context>;
    id?: IdResolver<number | null, any, Context>;
    module?: ModuleResolver<string | null, any, Context>;
    severity?: SeverityResolver<number | null, any, Context>;
    type?: TypeResolver<string | null, any, Context>;
  }

  export type CategoryResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IdResolver<R = number | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ModuleResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SeverityResolver<R = number | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace GeoEcsFieldsResolvers {
  export interface Resolvers<Context = any> {
    country_iso_code?: CountryIsoCodeResolver<string | null, any, Context>;
    region_name?: RegionNameResolver<string | null, any, Context>;
  }

  export type CountryIsoCodeResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type RegionNameResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace HostEcsFieldsResolvers {
  export interface Resolvers<Context = any> {
    hostname?: HostnameResolver<string | null, any, Context>;
    ip?: IpResolver<string | null, any, Context>;
  }

  export type HostnameResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IpResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SourceEcsFieldsResolvers {
  export interface Resolvers<Context = any> {
    ip?: IpResolver<string | null, any, Context>;
    port?: PortResolver<number | null, any, Context>;
  }

  export type IpResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PortResolver<R = number | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SuricataEcsFieldsResolvers {
  export interface Resolvers<Context = any> {
    eve?: EveResolver<SuricataEveData | null, any, Context>;
  }

  export type EveResolver<R = SuricataEveData | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SuricataEveDataResolvers {
  export interface Resolvers<Context = any> {
    alert?: AlertResolver<SuricataAlertData | null, any, Context>;
    flow_id?: FlowIdResolver<number | null, any, Context>;
    proto?: ProtoResolver<string | null, any, Context>;
  }

  export type AlertResolver<R = SuricataAlertData | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FlowIdResolver<R = number | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ProtoResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SuricataAlertDataResolvers {
  export interface Resolvers<Context = any> {
    signature?: SignatureResolver<string | null, any, Context>;
    signature_id?: SignatureIdResolver<number | null, any, Context>;
  }

  export type SignatureResolver<R = string | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SignatureIdResolver<R = number | null, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace SayMyNameResolvers {
  export interface Resolvers<Context = any> {
    appName?: AppNameResolver<string, any, Context> /** The id of the source */;
  }

  export type AppNameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
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
