/* tslint:disable */
import { GraphQLResolveInfo } from 'graphql';

type Resolver<Result, Args = any> = (
  parent: any,
  args: Args,
  context: any,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface InfraField {
  name?: string | null;
  type?: string | null;
  searchable?: boolean | null;
  aggregatable?: boolean | null;
}

export interface Query {
  map?: InfraResponse | null;
  fields?: (InfraField | null)[] | null;
  source: InfraSource /** Get an infrastructure data source by id */;
  allSources: InfraSource[] /** Get a list of all infrastructure data sources */;
}

export interface InfraResponse {
  groups?: InfraGroup[] | null;
  hosts?: InfraHost[] | null;
  pods?: InfraPod[] | null;
  containers?: InfraContainer[] | null;
  services?: InfraService[] | null;
}

export interface InfraGroup {
  name: string;
  groups?: InfraGroup[] | null;
  hosts?: InfraHost[] | null;
  pods?: InfraPod[] | null;
  containers?: InfraContainer[] | null;
  services?: InfraService[] | null;
}

export interface InfraHost {
  name?: string | null;
  type?: string | null;
  metrics?: InfraHostMetrics | null;
}

export interface InfraHostMetrics {
  count?: number | null;
}

export interface InfraPod {
  name?: string | null;
  type?: string | null;
  metrics?: InfraPodMetrics | null;
}

export interface InfraPodMetrics {
  count?: number | null;
}

export interface InfraContainer {
  name?: string | null;
  type?: string | null;
  metrics?: InfraContainerMetrics | null;
}

export interface InfraContainerMetrics {
  count?: number | null;
}

export interface InfraService {
  name?: string | null;
  type?: string | null;
  metrics?: InfraServiceMetrics | null;
}

export interface InfraServiceMetrics {
  count?: number | null;
}
/** A source of infrastructure data */
export interface InfraSource {
  id: string /** The id of the source */;
  configuration: InfraSourceConfiguration /** The raw configuration of the source */;
}
/** A set of configuration options for an infrastructure data source */
export interface InfraSourceConfiguration {
  metricAlias: string /** The alias to read metric data from */;
  logAlias: string /** The alias to read log data from */;
  fields: InfraSourceFields /** The field mapping to use for this source */;
}
/** A mapping of semantic fields to their document counterparts */
export interface InfraSourceFields {
  container: string /** The field to identify a container by */;
  hostname: string /** The fields to identify a host by */;
  message: string[] /** The fields that may contain the log event message. The first field found win. */;
  pod: string /** The field to identify a pod by */;
  tiebreaker: string /** The field to use as a tiebreaker for log events that have identical timestamps */;
  timestamp: string /** The field to use as a timestamp for metrics and logs */;
}

export namespace QueryResolvers {
  export interface Resolvers {
    map?: MapResolver;
    fields?: FieldsResolver;
    source?: SourceResolver /** Get an infrastructure data source by id */;
    allSources?: AllSourcesResolver /** Get a list of all infrastructure data sources */;
  }

  export type MapResolver = Resolver<InfraResponse | null, MapArgs>;
  export interface MapArgs {
    indexPattern: InfraIndexPattern;
    timerange: InfraTimerange;
    filters?: InfraFilter[] | null;
  }

  export type FieldsResolver = Resolver<(InfraField | null)[] | null, FieldsArgs>;
  export interface FieldsArgs {
    indexPattern?: InfraIndexPattern | null;
  }

  export type SourceResolver = Resolver<InfraSource, SourceArgs>;
  export interface SourceArgs {
    id: string /** The id of the source */;
  }

  export type AllSourcesResolver = Resolver<InfraSource[]>;
}

export namespace InfraResponseResolvers {
  export interface Resolvers {
    groups?: GroupsResolver;
    hosts?: HostsResolver;
    pods?: PodsResolver;
    containers?: ContainersResolver;
    services?: ServicesResolver;
  }

  export type GroupsResolver = Resolver<InfraGroup[] | null, GroupsArgs>;
  export interface GroupsArgs {
    type: InfraGroupByType;
    field?: string | null;
    filters?: (InfraGroupByFilter | null)[] | null;
  }

  export type HostsResolver = Resolver<InfraHost[] | null>;
  export type PodsResolver = Resolver<InfraPod[] | null>;
  export type ContainersResolver = Resolver<InfraContainer[] | null>;
  export type ServicesResolver = Resolver<InfraService[] | null>;
}

export namespace InfraGroupResolvers {
  export interface Resolvers {
    name?: NameResolver;
    groups?: GroupsResolver;
    hosts?: HostsResolver;
    pods?: PodsResolver;
    containers?: ContainersResolver;
    services?: ServicesResolver;
  }

  export type NameResolver = Resolver<string>;
  export type GroupsResolver = Resolver<InfraGroup[] | null, GroupsArgs>;
  export interface GroupsArgs {
    type: InfraGroupByType;
    field?: string | null;
    filters?: (InfraGroupByFilter | null)[] | null;
  }

  export type HostsResolver = Resolver<InfraHost[] | null>;
  export type PodsResolver = Resolver<InfraPod[] | null>;
  export type ContainersResolver = Resolver<InfraContainer[] | null>;
  export type ServicesResolver = Resolver<InfraService[] | null>;
}

export namespace InfraHostResolvers {
  export interface Resolvers {
    name?: NameResolver;
    type?: TypeResolver;
    metrics?: MetricsResolver;
  }

  export type NameResolver = Resolver<string | null>;
  export type TypeResolver = Resolver<string | null>;
  export type MetricsResolver = Resolver<InfraHostMetrics | null>;
}

export namespace InfraHostMetricsResolvers {
  export interface Resolvers {
    count?: CountResolver;
  }

  export type CountResolver = Resolver<number | null>;
}

export namespace InfraPodResolvers {
  export interface Resolvers {
    name?: NameResolver;
    type?: TypeResolver;
    metrics?: MetricsResolver;
  }

  export type NameResolver = Resolver<string | null>;
  export type TypeResolver = Resolver<string | null>;
  export type MetricsResolver = Resolver<InfraPodMetrics | null>;
}

export namespace InfraPodMetricsResolvers {
  export interface Resolvers {
    count?: CountResolver;
  }

  export type CountResolver = Resolver<number | null>;
}

export namespace InfraContainerResolvers {
  export interface Resolvers {
    name?: NameResolver;
    type?: TypeResolver;
    metrics?: MetricsResolver;
  }

  export type NameResolver = Resolver<string | null>;
  export type TypeResolver = Resolver<string | null>;
  export type MetricsResolver = Resolver<InfraContainerMetrics | null>;
}

export namespace InfraContainerMetricsResolvers {
  export interface Resolvers {
    count?: CountResolver;
  }

  export type CountResolver = Resolver<number | null>;
}

export namespace InfraServiceResolvers {
  export interface Resolvers {
    name?: NameResolver;
    type?: TypeResolver;
    metrics?: MetricsResolver;
  }

  export type NameResolver = Resolver<string | null>;
  export type TypeResolver = Resolver<string | null>;
  export type MetricsResolver = Resolver<InfraServiceMetrics | null>;
}

export namespace InfraServiceMetricsResolvers {
  export interface Resolvers {
    count?: CountResolver;
  }

  export type CountResolver = Resolver<number | null>;
}
/** A source of infrastructure data */
export namespace InfraSourceResolvers {
  export interface Resolvers {
    id?: IdResolver /** The id of the source */;
    configuration?: ConfigurationResolver /** The raw configuration of the source */;
  }

  export type IdResolver = Resolver<string>;
  export type ConfigurationResolver = Resolver<InfraSourceConfiguration>;
}
/** A set of configuration options for an infrastructure data source */
export namespace InfraSourceConfigurationResolvers {
  export interface Resolvers {
    metricAlias?: MetricAliasResolver /** The alias to read metric data from */;
    logAlias?: LogAliasResolver /** The alias to read log data from */;
    fields?: FieldsResolver /** The field mapping to use for this source */;
  }

  export type MetricAliasResolver = Resolver<string>;
  export type LogAliasResolver = Resolver<string>;
  export type FieldsResolver = Resolver<InfraSourceFields>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace InfraSourceFieldsResolvers {
  export interface Resolvers {
    container?: ContainerResolver /** The field to identify a container by */;
    hostname?: HostnameResolver /** The fields to identify a host by */;
    message?: MessageResolver /** The fields that may contain the log event message. The first field found win. */;
    pod?: PodResolver /** The field to identify a pod by */;
    tiebreaker?: TiebreakerResolver /** The field to use as a tiebreaker for log events that have identical timestamps */;
    timestamp?: TimestampResolver /** The field to use as a timestamp for metrics and logs */;
  }

  export type ContainerResolver = Resolver<string>;
  export type HostnameResolver = Resolver<string>;
  export type MessageResolver = Resolver<string[]>;
  export type PodResolver = Resolver<string>;
  export type TiebreakerResolver = Resolver<string>;
  export type TimestampResolver = Resolver<string>;
}

export interface InfraIndexPattern {
  pattern: string /** The index pattern to use, defaults to '*' */;
  timeFieldName: string /** The timefield to use, defaults to @timestamp */;
}

export interface InfraTimerange {
  interval: string /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */;
  to: number /** The end of the timerange */;
  from: number /** The beginning of the timerange */;
}

export interface InfraFilter {
  type: InfraFilterType /** The type of filter to use */;
  value: string /** The filter value */;
  field?: string | null /** The field name for a match query */;
}
/** A group by filter */
export interface InfraGroupByFilter {
  id: string /** The UUID for the group by filter */;
  label: string /** The label for the filter, this will be used as the group name in the final results */;
  query: string /** The query string query */;
}

export interface InfraGroupBy {
  id: string /** The UUID for the group by object */;
  type: InfraGroupByType /** The type of aggregation to use to bucket the groups */;
  label?:
    | string
    | null /** The label to use in the results for the group by for the terms group by */;
  field?:
    | string
    | null /** The field to group by from a terms aggregation, this is ignored by the filter group by */;
  filters?:
    | InfraGroupByFilter[]
    | null /** The filters to use for the group by aggregation, this is ignored by the terms group by */;
}
export interface MapQueryArgs {
  indexPattern: InfraIndexPattern;
  timerange: InfraTimerange;
  filters?: InfraFilter[] | null;
}
export interface FieldsQueryArgs {
  indexPattern?: InfraIndexPattern | null;
}
export interface SourceQueryArgs {
  id: string /** The id of the source */;
}
export interface GroupsInfraResponseArgs {
  type: InfraGroupByType;
  field?: string | null;
  filters?: (InfraGroupByFilter | null)[] | null;
}
export interface GroupsInfraGroupArgs {
  type: InfraGroupByType;
  field?: string | null;
  filters?: (InfraGroupByFilter | null)[] | null;
}

export enum InfraFilterType {
  query_string = 'query_string',
  match = 'match',
  exists = 'exists',
}

export enum InfraGroupByType {
  terms = 'terms',
  filters = 'filters',
}

export enum InfraOperator {
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  eq = 'eq',
}

export enum InfraMetricTypes {
  avg = 'avg',
  min = 'min',
  max = 'max',
  sum = 'sum',
  bucket_script = 'bucket_script',
  derivative = 'derivative',
  moving_average = 'moving_average',
  positive_only = 'positive_only',
}
