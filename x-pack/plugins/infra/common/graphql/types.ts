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
  fields?: (InfraField | null)[] | null;
  source: InfraSource /** Get an infrastructure data source by id */;
  allSources: InfraSource[] /** Get a list of all infrastructure data sources */;
}
/** A source of infrastructure data */
export interface InfraSource {
  id: string /** The id of the source */;
  configuration: InfraSourceConfiguration /** The raw configuration of the source */;
  status: InfraSourceStatus /** The status of the source */;
  map?: InfraResponse | null /** A hierarchy of hosts, pods, containers, services or arbitrary groups */;
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
/** The status of an infrastructure data source */
export interface InfraSourceStatus {
  metricAliasExists: boolean /** Whether the configured metric alias exists */;
  logAliasExists: boolean /** Whether the configured log alias exists */;
  metricIndices: string[] /** The list of indices in the metric alias */;
  logIndices: string[] /** The list of indices in the log alias */;
}

export interface InfraResponse {
  nodes?: InfraNode[] | null;
}

export interface InfraNode {
  path: InfraNodePath[];
  metrics: InfraNodeMetric[];
}

export interface InfraNodePath {
  id: string;
  value: string;
}

export interface InfraNodeMetric {
  id: string;
  name: string;
  value: number;
}

export namespace QueryResolvers {
  export interface Resolvers {
    fields?: FieldsResolver;
    source?: SourceResolver /** Get an infrastructure data source by id */;
    allSources?: AllSourcesResolver /** Get a list of all infrastructure data sources */;
  }

  export type FieldsResolver = Resolver<(InfraField | null)[] | null, FieldsArgs>;
  export interface FieldsArgs {
    indexPattern?: InfraIndexPatternInput | null;
  }

  export type SourceResolver = Resolver<InfraSource, SourceArgs>;
  export interface SourceArgs {
    id: string /** The id of the source */;
  }

  export type AllSourcesResolver = Resolver<InfraSource[]>;
}
/** A source of infrastructure data */
export namespace InfraSourceResolvers {
  export interface Resolvers {
    id?: IdResolver /** The id of the source */;
    configuration?: ConfigurationResolver /** The raw configuration of the source */;
    status?: StatusResolver /** The status of the source */;
    map?: MapResolver /** A hierarchy of hosts, pods, containers, services or arbitrary groups */;
  }

  export type IdResolver = Resolver<string>;
  export type ConfigurationResolver = Resolver<InfraSourceConfiguration>;
  export type StatusResolver = Resolver<InfraSourceStatus>;
  export type MapResolver = Resolver<InfraResponse | null, MapArgs>;
  export interface MapArgs {
    timerange: InfraTimerangeInput;
    filters?: InfraFilterInput[] | null;
  }
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
/** The status of an infrastructure data source */
export namespace InfraSourceStatusResolvers {
  export interface Resolvers {
    metricAliasExists?: MetricAliasExistsResolver /** Whether the configured metric alias exists */;
    logAliasExists?: LogAliasExistsResolver /** Whether the configured log alias exists */;
    metricIndices?: MetricIndicesResolver /** The list of indices in the metric alias */;
    logIndices?: LogIndicesResolver /** The list of indices in the log alias */;
  }

  export type MetricAliasExistsResolver = Resolver<boolean>;
  export type LogAliasExistsResolver = Resolver<boolean>;
  export type MetricIndicesResolver = Resolver<string[]>;
  export type LogIndicesResolver = Resolver<string[]>;
}

export namespace InfraResponseResolvers {
  export interface Resolvers {
    nodes?: NodesResolver;
  }

  export type NodesResolver = Resolver<InfraNode[] | null, NodesArgs>;
  export interface NodesArgs {
    path?: InfraPathInput[] | null;
  }
}

export namespace InfraNodeResolvers {
  export interface Resolvers {
    path?: PathResolver;
    metrics?: MetricsResolver;
  }

  export type PathResolver = Resolver<InfraNodePath[]>;
  export type MetricsResolver = Resolver<InfraNodeMetric[], MetricsArgs>;
  export interface MetricsArgs {
    metrics?: InfraMetricInput[] | null;
  }
}

export namespace InfraNodePathResolvers {
  export interface Resolvers {
    id?: IdResolver;
    value?: ValueResolver;
  }

  export type IdResolver = Resolver<string>;
  export type ValueResolver = Resolver<string>;
}

export namespace InfraNodeMetricResolvers {
  export interface Resolvers {
    id?: IdResolver;
    name?: NameResolver;
    value?: ValueResolver;
  }

  export type IdResolver = Resolver<string>;
  export type NameResolver = Resolver<string>;
  export type ValueResolver = Resolver<number>;
}

export interface InfraIndexPatternInput {
  pattern: string /** The index pattern to use, defaults to '*' */;
  timeFieldName: string /** The timefield to use, defaults to @timestamp */;
}

export interface InfraTimerangeInput {
  interval: string /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */;
  to: number /** The end of the timerange */;
  from: number /** The beginning of the timerange */;
}

export interface InfraFilterInput {
  type: InfraFilterType /** The type of filter to use */;
  value: string /** The filter value */;
  field?: string | null /** The field name for a match query */;
}

export interface InfraPathInput {
  id: string /** The UUID for the path by object */;
  type: InfraPathType /** The type of path */;
  label?:
    | string
    | null /** The label to use in the results for the group by for the terms group by */;
  field?:
    | string
    | null /** The field to group by from a terms aggregation, this is ignored by the filter type */;
  filters?: InfraPathFilterInput[] | null /** The fitlers for the filter group by */;
}
/** A group by filter */
export interface InfraPathFilterInput {
  id: string /** The UUID for the path filter */;
  label: string /** The label for the filter, this will be used as the group name in the final results */;
  query: string /** The query string query */;
}

export interface InfraMetricInput {
  type: InfraMetricType /** The type of metric */;
  aggs?: InfraMetricAggInput[] | null /** The aggregations for custom metrics */;
}

export interface InfraMetricAggInput {
  id: string /** The UUID from the metric aggregation */;
  type: InfraMetricAggregationType /** The type of aggregation */;
  field?:
    | string
    | null /** The field to use for the aggregation, this is only used for metric aggregations */;
  metric?:
    | string
    | null /** The metric to referece for the aggregation, this is only used for pipeline aggreations */;
  settings?:
    | string
    | null /** Additional settings for pipeline aggregations in a key:value comma delimited format */;
  script?: string | null /** Script field for bucket_script aggregations */;
}
export interface FieldsQueryArgs {
  indexPattern?: InfraIndexPatternInput | null;
}
export interface SourceQueryArgs {
  id: string /** The id of the source */;
}
export interface MapInfraSourceArgs {
  timerange: InfraTimerangeInput;
  filters?: InfraFilterInput[] | null;
}
export interface NodesInfraResponseArgs {
  path?: InfraPathInput[] | null;
}
export interface MetricsInfraNodeArgs {
  metrics?: InfraMetricInput[] | null;
}

export enum InfraFilterType {
  query_string = 'query_string',
  match = 'match',
  exists = 'exists',
}

export enum InfraPathType {
  terms = 'terms',
  filters = 'filters',
  hosts = 'hosts',
  pods = 'pods',
  containers = 'containers',
}

export enum InfraMetricType {
  count = 'count',
  cpu = 'cpu',
  memory = 'memory',
  tx = 'tx',
  rx = 'rx',
  disk = 'disk',
  custom = 'custom',
}

export enum InfraMetricAggregationType {
  avg = 'avg',
  min = 'min',
  max = 'max',
  sum = 'sum',
  bucket_script = 'bucket_script',
  derivative = 'derivative',
  moving_average = 'moving_average',
  positive_only = 'positive_only',
}

export enum InfraOperator {
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  eq = 'eq',
}
export namespace Query {
  export type Variables = {
    id: string;
    timerange: InfraTimerangeInput;
    filters?: InfraFilterInput[] | null;
    metrics?: InfraMetricInput[] | null;
    path?: InfraPathInput[] | null;
  };

  export type Query = {
    __typename?: 'Query';
    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';
    id: string;
    map?: Map | null;
  };

  export type Map = {
    __typename?: 'InfraResponse';
    nodes?: Nodes[] | null;
  };

  export type Nodes = {
    __typename?: 'InfraNode';
    path: Path[];
    metrics: Metrics[];
  };

  export type Path = {
    __typename?: 'InfraNodePath';
    value: string;
  };

  export type Metrics = {
    __typename?: 'InfraNodeMetric';
    name: string;
    value: number;
  };
}
