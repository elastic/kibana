/* tslint:disable */
import { GraphQLResolveInfo } from 'graphql';

type Resolver<Result, Args = any> = (
  parent: any,
  args: Args,
  context: any,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface Query {
  source: InfraSource /** Get an infrastructure data source by id */;
  allSources: InfraSource[] /** Get a list of all infrastructure data sources */;
}
/** A source of infrastructure data */
export interface InfraSource {
  id: string /** The id of the source */;
  configuration: InfraSourceConfiguration /** The raw configuration of the source */;
  status: InfraSourceStatus /** The status of the source */;
  capabilitiesByNode: (InfraNodeCapability | null)[] /** A hierarchy of capabilities available on nodes */;
  logEntriesAround: InfraLogEntryInterval /** A consecutive span of log entries surrounding a point in time */;
  logEntriesBetween: InfraLogEntryInterval /** A consecutive span of log entries within an interval */;
  logSummaryBetween: InfraLogSummaryInterval /** A consecutive span of summary buckets within an interval */;
  map?: InfraResponse | null /** A hierarchy of hosts, pods, containers, services or arbitrary groups */;
  metrics: InfraMetricData[];
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
  host: string /** The fields to identify a host by */;
  message: string[] /** The fields that may contain the log event message. The first field found win. */;
  pod: string /** The field to identify a pod by */;
  tiebreaker: string /** The field to use as a tiebreaker for log events that have identical timestamps */;
  timestamp: string /** The field to use as a timestamp for metrics and logs */;
}
/** The status of an infrastructure data source */
export interface InfraSourceStatus {
  metricAliasExists: boolean /** Whether the configured metric alias exists */;
  logAliasExists: boolean /** Whether the configured log alias exists */;
  metricIndicesExist: boolean /** Whether the configured alias or wildcard pattern resolve to any metric indices */;
  logIndicesExist: boolean /** Whether the configured alias or wildcard pattern resolve to any log indices */;
  metricIndices: string[] /** The list of indices in the metric alias */;
  logIndices: string[] /** The list of indices in the log alias */;
  indexFields: InfraIndexField[] /** The list of fields defined in the index mappings */;
}
/** A descriptor of a field in an index */
export interface InfraIndexField {
  name: string /** The name of the field */;
  type: string /** The type of the field's values as recognized by Kibana */;
  searchable: boolean /** Whether the field's values can be efficiently searched for */;
  aggregatable: boolean /** Whether the field's values can be aggregated */;
}
/** One specific capability available on a node. A capability corresponds to a fileset or metricset */
export interface InfraNodeCapability {
  name: string;
  source: string;
}
/** A consecutive sequence of log entries */
export interface InfraLogEntryInterval {
  start?: InfraTimeKey | null /** The key corresponding to the start of the interval covered by the entries */;
  end?: InfraTimeKey | null /** The key corresponding to the end of the interval covered by the entries */;
  hasMoreBefore: boolean /** Whether there are more log entries available before the start */;
  hasMoreAfter: boolean /** Whether there are more log entries available after the end */;
  filterQuery?: string | null /** The query the log entries were filtered by */;
  highlightQuery?: string | null /** The query the log entries were highlighted with */;
  entries: InfraLogEntry[] /** A list of the log entries */;
}
/** A representation of the log entry's position in the event stream */
export interface InfraTimeKey {
  time: number /** The timestamp of the event that the log entry corresponds to */;
  tiebreaker: number /** The tiebreaker that disambiguates events with the same timestamp */;
}
/** A log entry */
export interface InfraLogEntry {
  key: InfraTimeKey /** A unique representation of the log entry's position in the event stream */;
  gid: string /** The log entry's id */;
  source: string /** The source id */;
  message: InfraLogMessageSegment[] /** A list of the formatted log entry segments */;
}
/** A segment of the log entry message that was derived from a field */
export interface InfraLogMessageFieldSegment {
  field: string /** The field the segment was derived from */;
  value: string /** The segment's message */;
  highlights: string[] /** A list of highlighted substrings of the value */;
}
/** A segment of the log entry message that was derived from a field */
export interface InfraLogMessageConstantSegment {
  constant: string /** The segment's message */;
}
/** A consecutive sequence of log summary buckets */
export interface InfraLogSummaryInterval {
  start?:
    | number
    | null /** The millisecond timestamp corresponding to the start of the interval covered by the summary */;
  end?:
    | number
    | null /** The millisecond timestamp corresponding to the end of the interval covered by the summary */;
  filterQuery?: string | null /** The query the log entries were filtered by */;
  buckets: InfraLogSummaryBucket[] /** A list of the log entries */;
}
/** A log summary bucket */
export interface InfraLogSummaryBucket {
  start: number /** The start timestamp of the bucket */;
  end: number /** The end timestamp of the bucket */;
  entriesCount: number /** The number of entries inside the bucket */;
}

export interface InfraResponse {
  nodes: InfraNode[];
}

export interface InfraNode {
  path: InfraNodePath[];
  metric: InfraNodeMetric;
}

export interface InfraNodePath {
  value: string;
}

export interface InfraNodeMetric {
  name: InfraMetricType;
  value: number;
}

export interface InfraMetricData {
  id?: InfraMetric | null;
  series: InfraDataSeries[];
}

export interface InfraDataSeries {
  id: string;
  data: InfraDataPoint[];
}

export interface InfraDataPoint {
  timestamp: number;
  value?: number | null;
}

export namespace QueryResolvers {
  export interface Resolvers {
    source?: SourceResolver /** Get an infrastructure data source by id */;
    allSources?: AllSourcesResolver /** Get a list of all infrastructure data sources */;
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
    capabilitiesByNode?: CapabilitiesByNodeResolver /** A hierarchy of capabilities available on nodes */;
    logEntriesAround?: LogEntriesAroundResolver /** A consecutive span of log entries surrounding a point in time */;
    logEntriesBetween?: LogEntriesBetweenResolver /** A consecutive span of log entries within an interval */;
    logSummaryBetween?: LogSummaryBetweenResolver /** A consecutive span of summary buckets within an interval */;
    map?: MapResolver /** A hierarchy of hosts, pods, containers, services or arbitrary groups */;
    metrics?: MetricsResolver;
  }

  export type IdResolver = Resolver<string>;
  export type ConfigurationResolver = Resolver<InfraSourceConfiguration>;
  export type StatusResolver = Resolver<InfraSourceStatus>;
  export type CapabilitiesByNodeResolver = Resolver<
    (InfraNodeCapability | null)[],
    CapabilitiesByNodeArgs
  >;
  export interface CapabilitiesByNodeArgs {
    nodeName: string;
    nodeType: InfraNodeType;
  }

  export type LogEntriesAroundResolver = Resolver<InfraLogEntryInterval, LogEntriesAroundArgs>;
  export interface LogEntriesAroundArgs {
    key: InfraTimeKeyInput /** The sort key that corresponds to the point in time */;
    countBefore?: number | null /** The maximum number of preceding to return */;
    countAfter?: number | null /** The maximum number of following to return */;
    filterQuery?: string | null /** The query to filter the log entries by */;
    highlightQuery?: string | null /** The query to highlight the log entries with */;
  }

  export type LogEntriesBetweenResolver = Resolver<InfraLogEntryInterval, LogEntriesBetweenArgs>;
  export interface LogEntriesBetweenArgs {
    startKey: InfraTimeKeyInput /** The sort key that corresponds to the start of the interval */;
    endKey: InfraTimeKeyInput /** The sort key that corresponds to the end of the interval */;
    filterQuery?: string | null /** The query to filter the log entries by */;
    highlightQuery?: string | null /** The query to highlight the log entries with */;
  }

  export type LogSummaryBetweenResolver = Resolver<InfraLogSummaryInterval, LogSummaryBetweenArgs>;
  export interface LogSummaryBetweenArgs {
    start: number /** The millisecond timestamp that corresponds to the start of the interval */;
    end: number /** The millisecond timestamp that corresponds to the end of the interval */;
    bucketSize: number /** The size of each bucket in milliseconds */;
    filterQuery?: string | null /** The query to filter the log entries by */;
  }

  export type MapResolver = Resolver<InfraResponse | null, MapArgs>;
  export interface MapArgs {
    timerange: InfraTimerangeInput;
    filterQuery?: string | null;
  }

  export type MetricsResolver = Resolver<InfraMetricData[], MetricsArgs>;
  export interface MetricsArgs {
    nodeId: string;
    nodeType: InfraNodeType;
    timerange: InfraTimerangeInput;
    metrics: InfraMetric[];
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
/** The status of an infrastructure data source */
export namespace InfraSourceStatusResolvers {
  export interface Resolvers {
    metricAliasExists?: MetricAliasExistsResolver /** Whether the configured metric alias exists */;
    logAliasExists?: LogAliasExistsResolver /** Whether the configured log alias exists */;
    metricIndicesExist?: MetricIndicesExistResolver /** Whether the configured alias or wildcard pattern resolve to any metric indices */;
    logIndicesExist?: LogIndicesExistResolver /** Whether the configured alias or wildcard pattern resolve to any log indices */;
    metricIndices?: MetricIndicesResolver /** The list of indices in the metric alias */;
    logIndices?: LogIndicesResolver /** The list of indices in the log alias */;
    indexFields?: IndexFieldsResolver /** The list of fields defined in the index mappings */;
  }

  export type MetricAliasExistsResolver = Resolver<boolean>;
  export type LogAliasExistsResolver = Resolver<boolean>;
  export type MetricIndicesExistResolver = Resolver<boolean>;
  export type LogIndicesExistResolver = Resolver<boolean>;
  export type MetricIndicesResolver = Resolver<string[]>;
  export type LogIndicesResolver = Resolver<string[]>;
  export type IndexFieldsResolver = Resolver<InfraIndexField[], IndexFieldsArgs>;
  export interface IndexFieldsArgs {
    indexType?: InfraIndexType | null;
  }
}
/** A descriptor of a field in an index */
export namespace InfraIndexFieldResolvers {
  export interface Resolvers {
    name?: NameResolver /** The name of the field */;
    type?: TypeResolver /** The type of the field's values as recognized by Kibana */;
    searchable?: SearchableResolver /** Whether the field's values can be efficiently searched for */;
    aggregatable?: AggregatableResolver /** Whether the field's values can be aggregated */;
  }

  export type NameResolver = Resolver<string>;
  export type TypeResolver = Resolver<string>;
  export type SearchableResolver = Resolver<boolean>;
  export type AggregatableResolver = Resolver<boolean>;
}
/** One specific capability available on a node. A capability corresponds to a fileset or metricset */
export namespace InfraNodeCapabilityResolvers {
  export interface Resolvers {
    name?: NameResolver;
    source?: SourceResolver;
  }

  export type NameResolver = Resolver<string>;
  export type SourceResolver = Resolver<string>;
}
/** A consecutive sequence of log entries */
export namespace InfraLogEntryIntervalResolvers {
  export interface Resolvers {
    start?: StartResolver /** The key corresponding to the start of the interval covered by the entries */;
    end?: EndResolver /** The key corresponding to the end of the interval covered by the entries */;
    hasMoreBefore?: HasMoreBeforeResolver /** Whether there are more log entries available before the start */;
    hasMoreAfter?: HasMoreAfterResolver /** Whether there are more log entries available after the end */;
    filterQuery?: FilterQueryResolver /** The query the log entries were filtered by */;
    highlightQuery?: HighlightQueryResolver /** The query the log entries were highlighted with */;
    entries?: EntriesResolver /** A list of the log entries */;
  }

  export type StartResolver = Resolver<InfraTimeKey | null>;
  export type EndResolver = Resolver<InfraTimeKey | null>;
  export type HasMoreBeforeResolver = Resolver<boolean>;
  export type HasMoreAfterResolver = Resolver<boolean>;
  export type FilterQueryResolver = Resolver<string | null>;
  export type HighlightQueryResolver = Resolver<string | null>;
  export type EntriesResolver = Resolver<InfraLogEntry[]>;
}
/** A representation of the log entry's position in the event stream */
export namespace InfraTimeKeyResolvers {
  export interface Resolvers {
    time?: TimeResolver /** The timestamp of the event that the log entry corresponds to */;
    tiebreaker?: TiebreakerResolver /** The tiebreaker that disambiguates events with the same timestamp */;
  }

  export type TimeResolver = Resolver<number>;
  export type TiebreakerResolver = Resolver<number>;
}
/** A log entry */
export namespace InfraLogEntryResolvers {
  export interface Resolvers {
    key?: KeyResolver /** A unique representation of the log entry's position in the event stream */;
    gid?: GidResolver /** The log entry's id */;
    source?: SourceResolver /** The source id */;
    message?: MessageResolver /** A list of the formatted log entry segments */;
  }

  export type KeyResolver = Resolver<InfraTimeKey>;
  export type GidResolver = Resolver<string>;
  export type SourceResolver = Resolver<string>;
  export type MessageResolver = Resolver<InfraLogMessageSegment[]>;
}
/** A segment of the log entry message that was derived from a field */
export namespace InfraLogMessageFieldSegmentResolvers {
  export interface Resolvers {
    field?: FieldResolver /** The field the segment was derived from */;
    value?: ValueResolver /** The segment's message */;
    highlights?: HighlightsResolver /** A list of highlighted substrings of the value */;
  }

  export type FieldResolver = Resolver<string>;
  export type ValueResolver = Resolver<string>;
  export type HighlightsResolver = Resolver<string[]>;
}
/** A segment of the log entry message that was derived from a field */
export namespace InfraLogMessageConstantSegmentResolvers {
  export interface Resolvers {
    constant?: ConstantResolver /** The segment's message */;
  }

  export type ConstantResolver = Resolver<string>;
}
/** A consecutive sequence of log summary buckets */
export namespace InfraLogSummaryIntervalResolvers {
  export interface Resolvers {
    start?: StartResolver /** The millisecond timestamp corresponding to the start of the interval covered by the summary */;
    end?: EndResolver /** The millisecond timestamp corresponding to the end of the interval covered by the summary */;
    filterQuery?: FilterQueryResolver /** The query the log entries were filtered by */;
    buckets?: BucketsResolver /** A list of the log entries */;
  }

  export type StartResolver = Resolver<number | null>;
  export type EndResolver = Resolver<number | null>;
  export type FilterQueryResolver = Resolver<string | null>;
  export type BucketsResolver = Resolver<InfraLogSummaryBucket[]>;
}
/** A log summary bucket */
export namespace InfraLogSummaryBucketResolvers {
  export interface Resolvers {
    start?: StartResolver /** The start timestamp of the bucket */;
    end?: EndResolver /** The end timestamp of the bucket */;
    entriesCount?: EntriesCountResolver /** The number of entries inside the bucket */;
  }

  export type StartResolver = Resolver<number>;
  export type EndResolver = Resolver<number>;
  export type EntriesCountResolver = Resolver<number>;
}

export namespace InfraResponseResolvers {
  export interface Resolvers {
    nodes?: NodesResolver;
  }

  export type NodesResolver = Resolver<InfraNode[], NodesArgs>;
  export interface NodesArgs {
    path: InfraPathInput[];
    metric: InfraMetricInput;
  }
}

export namespace InfraNodeResolvers {
  export interface Resolvers {
    path?: PathResolver;
    metric?: MetricResolver;
  }

  export type PathResolver = Resolver<InfraNodePath[]>;
  export type MetricResolver = Resolver<InfraNodeMetric>;
}

export namespace InfraNodePathResolvers {
  export interface Resolvers {
    value?: ValueResolver;
  }

  export type ValueResolver = Resolver<string>;
}

export namespace InfraNodeMetricResolvers {
  export interface Resolvers {
    name?: NameResolver;
    value?: ValueResolver;
  }

  export type NameResolver = Resolver<InfraMetricType>;
  export type ValueResolver = Resolver<number>;
}

export namespace InfraMetricDataResolvers {
  export interface Resolvers {
    id?: IdResolver;
    series?: SeriesResolver;
  }

  export type IdResolver = Resolver<InfraMetric | null>;
  export type SeriesResolver = Resolver<InfraDataSeries[]>;
}

export namespace InfraDataSeriesResolvers {
  export interface Resolvers {
    id?: IdResolver;
    data?: DataResolver;
  }

  export type IdResolver = Resolver<string>;
  export type DataResolver = Resolver<InfraDataPoint[]>;
}

export namespace InfraDataPointResolvers {
  export interface Resolvers {
    timestamp?: TimestampResolver;
    value?: ValueResolver;
  }

  export type TimestampResolver = Resolver<number>;
  export type ValueResolver = Resolver<number | null>;
}

export interface InfraTimeKeyInput {
  time: number;
  tiebreaker: number;
}

export interface InfraTimerangeInput {
  interval: string /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */;
  to: number /** The end of the timerange */;
  from: number /** The beginning of the timerange */;
}

export interface InfraPathInput {
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
  label: string /** The label for the filter, this will be used as the group name in the final results */;
  query: string /** The query string query */;
}

export interface InfraMetricInput {
  type: InfraMetricType /** The type of metric */;
}
export interface SourceQueryArgs {
  id: string /** The id of the source */;
}
export interface CapabilitiesByNodeInfraSourceArgs {
  nodeName: string;
  nodeType: InfraNodeType;
}
export interface LogEntriesAroundInfraSourceArgs {
  key: InfraTimeKeyInput /** The sort key that corresponds to the point in time */;
  countBefore?: number | null /** The maximum number of preceding to return */;
  countAfter?: number | null /** The maximum number of following to return */;
  filterQuery?: string | null /** The query to filter the log entries by */;
  highlightQuery?: string | null /** The query to highlight the log entries with */;
}
export interface LogEntriesBetweenInfraSourceArgs {
  startKey: InfraTimeKeyInput /** The sort key that corresponds to the start of the interval */;
  endKey: InfraTimeKeyInput /** The sort key that corresponds to the end of the interval */;
  filterQuery?: string | null /** The query to filter the log entries by */;
  highlightQuery?: string | null /** The query to highlight the log entries with */;
}
export interface LogSummaryBetweenInfraSourceArgs {
  start: number /** The millisecond timestamp that corresponds to the start of the interval */;
  end: number /** The millisecond timestamp that corresponds to the end of the interval */;
  bucketSize: number /** The size of each bucket in milliseconds */;
  filterQuery?: string | null /** The query to filter the log entries by */;
}
export interface MapInfraSourceArgs {
  timerange: InfraTimerangeInput;
  filterQuery?: string | null;
}
export interface MetricsInfraSourceArgs {
  nodeId: string;
  nodeType: InfraNodeType;
  timerange: InfraTimerangeInput;
  metrics: InfraMetric[];
}
export interface IndexFieldsInfraSourceStatusArgs {
  indexType?: InfraIndexType | null;
}
export interface NodesInfraResponseArgs {
  path: InfraPathInput[];
  metric: InfraMetricInput;
}

export enum InfraIndexType {
  ANY = 'ANY',
  LOGS = 'LOGS',
  METRICS = 'METRICS',
}

export enum InfraNodeType {
  pod = 'pod',
  container = 'container',
  host = 'host',
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
  load = 'load',
  memory = 'memory',
  tx = 'tx',
  rx = 'rx',
  logRate = 'logRate',
}

export enum InfraMetric {
  hostSystemOverview = 'hostSystemOverview',
  hostCpuUsage = 'hostCpuUsage',
  hostFilesystem = 'hostFilesystem',
  hostK8sOverview = 'hostK8sOverview',
  hostK8sCpuCap = 'hostK8sCpuCap',
  hostK8sDiskCap = 'hostK8sDiskCap',
  hostK8sMemoryCap = 'hostK8sMemoryCap',
  hostK8sPodCap = 'hostK8sPodCap',
  hostLoad = 'hostLoad',
  hostMemoryUsage = 'hostMemoryUsage',
  hostNetworkTraffic = 'hostNetworkTraffic',
  podOverview = 'podOverview',
  podCpuUsage = 'podCpuUsage',
  podMemoryUsage = 'podMemoryUsage',
  podLogUsage = 'podLogUsage',
  podNetworkTraffic = 'podNetworkTraffic',
  containerOverview = 'containerOverview',
  containerCpuKernel = 'containerCpuKernel',
  containerCpuUsage = 'containerCpuUsage',
  containerDiskIOOps = 'containerDiskIOOps',
  containerDiskIOBytes = 'containerDiskIOBytes',
  containerMemory = 'containerMemory',
  containerNetworkTraffic = 'containerNetworkTraffic',
  nginxHits = 'nginxHits',
  nginxRequestRate = 'nginxRequestRate',
  nginxActiveConnections = 'nginxActiveConnections',
  nginxRequestsPerConnection = 'nginxRequestsPerConnection',
}

export enum InfraOperator {
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  eq = 'eq',
}
/** A segment of the log entry message */
export type InfraLogMessageSegment = InfraLogMessageFieldSegment | InfraLogMessageConstantSegment;

export namespace CapabilitiesQuery {
  export type Variables = {
    sourceId: string;
    nodeId: string;
    nodeType: InfraNodeType;
  };

  export type Query = {
    __typename?: 'Query';
    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';
    id: string;
    capabilitiesByNode: (CapabilitiesByNode | null)[];
  };

  export type CapabilitiesByNode = {
    __typename?: 'InfraNodeCapability';
    name: string;
    source: string;
  };
}
export namespace MetricsQuery {
  export type Variables = {
    sourceId: string;
    timerange: InfraTimerangeInput;
    metrics: InfraMetric[];
    nodeId: string;
    nodeType: InfraNodeType;
  };

  export type Query = {
    __typename?: 'Query';
    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';
    id: string;
    metrics: Metrics[];
  };

  export type Metrics = {
    __typename?: 'InfraMetricData';
    id?: InfraMetric | null;
    series: Series[];
  };

  export type Series = {
    __typename?: 'InfraDataSeries';
    id: string;
    data: Data[];
  };

  export type Data = {
    __typename?: 'InfraDataPoint';
    timestamp: number;
    value?: number | null;
  };
}
export namespace WaffleNodesQuery {
  export type Variables = {
    sourceId: string;
    timerange: InfraTimerangeInput;
    filterQuery?: string | null;
    metric: InfraMetricInput;
    path: InfraPathInput[];
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
    nodes: Nodes[];
  };

  export type Nodes = {
    __typename?: 'InfraNode';
    path: Path[];
    metric: Metric;
  };

  export type Path = {
    __typename?: 'InfraNodePath';
    value: string;
  };

  export type Metric = {
    __typename?: 'InfraNodeMetric';
    name: InfraMetricType;
    value: number;
  };
}
export namespace LogEntries {
  export type Variables = {
    sourceId?: string | null;
    timeKey: InfraTimeKeyInput;
    countBefore?: number | null;
    countAfter?: number | null;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';
    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';
    id: string;
    logEntriesAround: LogEntriesAround;
  };

  export type LogEntriesAround = {
    __typename?: 'InfraLogEntryInterval';
    start?: Start | null;
    end?: End | null;
    hasMoreBefore: boolean;
    hasMoreAfter: boolean;
    entries: Entries[];
  };

  export type Start = InfraTimeKeyFields.Fragment;

  export type End = InfraTimeKeyFields.Fragment;

  export type Entries = {
    __typename?: 'InfraLogEntry';
    gid: string;
    key: Key;
    message: Message[];
  };

  export type Key = {
    __typename?: 'InfraTimeKey';
    time: number;
    tiebreaker: number;
  };

  export type Message =
    | InfraLogMessageFieldSegmentInlineFragment
    | InfraLogMessageConstantSegmentInlineFragment;

  export type InfraLogMessageFieldSegmentInlineFragment = {
    __typename?: 'InfraLogMessageFieldSegment';
    field: string;
    value: string;
  };

  export type InfraLogMessageConstantSegmentInlineFragment = {
    __typename?: 'InfraLogMessageConstantSegment';
    constant: string;
  };
}
export namespace LogSummary {
  export type Variables = {
    sourceId?: string | null;
    start: number;
    end: number;
    bucketSize: number;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';
    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';
    id: string;
    logSummaryBetween: LogSummaryBetween;
  };

  export type LogSummaryBetween = {
    __typename?: 'InfraLogSummaryInterval';
    start?: number | null;
    end?: number | null;
    buckets: Buckets[];
  };

  export type Buckets = {
    __typename?: 'InfraLogSummaryBucket';
    start: number;
    end: number;
    entriesCount: number;
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
    __typename?: 'InfraSource';
    configuration: Configuration;
    status: Status;
  };

  export type Configuration = {
    __typename?: 'InfraSourceConfiguration';
    metricAlias: string;
    logAlias: string;
    fields: Fields;
  };

  export type Fields = {
    __typename?: 'InfraSourceFields';
    container: string;
    host: string;
    pod: string;
  };

  export type Status = {
    __typename?: 'InfraSourceStatus';
    indexFields: IndexFields[];
    logIndicesExist: boolean;
    metricIndicesExist: boolean;
  };

  export type IndexFields = {
    __typename?: 'InfraIndexField';
    name: string;
    type: string;
    searchable: boolean;
    aggregatable: boolean;
  };
}

export namespace InfraTimeKeyFields {
  export type Fragment = {
    __typename?: 'InfraTimeKey';
    time: number;
    tiebreaker: number;
  };
}
