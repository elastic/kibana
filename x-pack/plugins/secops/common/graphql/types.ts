/* tslint:disable */
import { GraphQLResolveInfo } from 'graphql';

type Resolver<Result, Args = any> = (
  parent: any,
  args: Args,
  context: any,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface Query {
  source: Source /** Get a security data source by id */;
  allSources: Source[] /** Get a list of all security data sources */;
}

export interface Source {
  id: string /** The id of the source */;
  configuration: SourceConfiguration /** The raw configuration of the source */;
  getSuricataEvents: SuricataEvents[] /** Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */;
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
  srcPort: number;
  destIp: string;
  destPort: number;
  geoRegionName: string;
  geoCountryIsoCode: string;
}

export interface SayMyName {
  appName: string /** The id of the source */;
}

export namespace QueryResolvers {
  export interface Resolvers {
    source?: SourceResolver /** Get a security data source by id */;
    allSources?: AllSourcesResolver /** Get a list of all security data sources */;
  }

  export type SourceResolver = Resolver<Source, SourceArgs>;
  export interface SourceArgs {
    id: string /** The id of the source */;
  }

  export type AllSourcesResolver = Resolver<Source[]>;
}

export namespace SourceResolvers {
  export interface Resolvers {
    id?: IdResolver /** The id of the source */;
    configuration?: ConfigurationResolver /** The raw configuration of the source */;
    getSuricataEvents?: GetSuricataEventsResolver /** Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */;
    whoAmI?: WhoAmIResolver /** Just a simple example to get the app name */;
  }

  export type IdResolver = Resolver<string>;
  export type ConfigurationResolver = Resolver<SourceConfiguration>;
  export type GetSuricataEventsResolver = Resolver<SuricataEvents[], GetSuricataEventsArgs>;
  export interface GetSuricataEventsArgs {
    timerange: TimerangeInput;
    filterQuery?: string | null;
  }

  export type WhoAmIResolver = Resolver<SayMyName | null>;
}
/** A set of configuration options for a security data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers {
    fileAlias?: FileAliasResolver /** The alias to read file data from */;
    fields?: FieldsResolver /** The field mapping to use for this source */;
  }

  export type FileAliasResolver = Resolver<string>;
  export type FieldsResolver = Resolver<SourceFields>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers {
    container?: ContainerResolver /** The field to identify a container by */;
    host?: HostResolver /** The fields to identify a host by */;
    message?: MessageResolver /** The fields that may contain the log event message. The first field found win. */;
    pod?: PodResolver /** The field to identify a pod by */;
    tiebreaker?: TiebreakerResolver /** The field to use as a tiebreaker for log events that have identical timestamps */;
    timestamp?: TimestampResolver /** The field to use as a timestamp for metrics and logs */;
  }

  export type ContainerResolver = Resolver<string>;
  export type HostResolver = Resolver<string>;
  export type MessageResolver = Resolver<string[]>;
  export type PodResolver = Resolver<string>;
  export type TiebreakerResolver = Resolver<string>;
  export type TimestampResolver = Resolver<string>;
}

export namespace SuricataEventsResolvers {
  export interface Resolvers {
    timestamp?: TimestampResolver;
    eventType?: EventTypeResolver;
    flowId?: FlowIdResolver;
    proto?: ProtoResolver;
    srcIp?: SrcIpResolver;
    srcPort?: SrcPortResolver;
    destIp?: DestIpResolver;
    destPort?: DestPortResolver;
    geoRegionName?: GeoRegionNameResolver;
    geoCountryIsoCode?: GeoCountryIsoCodeResolver;
  }

  export type TimestampResolver = Resolver<string>;
  export type EventTypeResolver = Resolver<string>;
  export type FlowIdResolver = Resolver<string>;
  export type ProtoResolver = Resolver<string>;
  export type SrcIpResolver = Resolver<string>;
  export type SrcPortResolver = Resolver<number>;
  export type DestIpResolver = Resolver<string>;
  export type DestPortResolver = Resolver<number>;
  export type GeoRegionNameResolver = Resolver<string>;
  export type GeoCountryIsoCodeResolver = Resolver<string>;
}

export namespace SayMyNameResolvers {
  export interface Resolvers {
    appName?: AppNameResolver /** The id of the source */;
  }

  export type AppNameResolver = Resolver<string>;
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
