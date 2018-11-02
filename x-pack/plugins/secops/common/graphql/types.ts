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
  getSuricataEvents?: (SuricataEvents | null)[] | null /** Get all event from suricata */;
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

export interface SuricataEvents {
  timestamp: string;
  eventType: string;
  flowId: string;
  proto: string;
  srcIp: string;
  srcPort: string;
  destIp: string;
  destPort: string;
  geoRegionName: string;
  geoCountryIsoCode: string;
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
export interface GetSuricataEventsSourceArgs {
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
    getSuricataEvents?: GetSuricataEventsResolver<
      (SuricataEvents | null)[] | null,
      any,
      Context
    > /** Get all event from suricata */;
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
  export type GetSuricataEventsResolver<
    R = (SuricataEvents | null)[] | null,
    Parent = any,
    Context = any
  > = Resolver<R, Parent, Context, GetSuricataEventsArgs>;
  export interface GetSuricataEventsArgs {
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

export namespace SuricataEventsResolvers {
  export interface Resolvers<Context = any> {
    timestamp?: TimestampResolver<string, any, Context>;
    eventType?: EventTypeResolver<string, any, Context>;
    flowId?: FlowIdResolver<string, any, Context>;
    proto?: ProtoResolver<string, any, Context>;
    srcIp?: SrcIpResolver<string, any, Context>;
    srcPort?: SrcPortResolver<string, any, Context>;
    destIp?: DestIpResolver<string, any, Context>;
    destPort?: DestPortResolver<string, any, Context>;
    geoRegionName?: GeoRegionNameResolver<string, any, Context>;
    geoCountryIsoCode?: GeoCountryIsoCodeResolver<string, any, Context>;
  }

  export type TimestampResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type EventTypeResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FlowIdResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ProtoResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type SrcIpResolver<R = string, Parent = any, Context = any> = Resolver<R, Parent, Context>;
  export type SrcPortResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DestIpResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DestPortResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type GeoRegionNameResolver<R = string, Parent = any, Context = any> = Resolver<
    R,
    Parent,
    Context
  >;
  export type GeoCountryIsoCodeResolver<R = string, Parent = any, Context = any> = Resolver<
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
