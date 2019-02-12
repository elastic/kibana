/* tslint:disable */
import { InfraContext } from '../lib/infra_types';
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
  /** Get an infrastructure data source by id.The resolution order for the source configuration attributes is as followswith the first defined value winning:1. The attributes of the saved object with the given 'id'.2. The attributes defined in the static Kibana configuration key'xpack.infra.sources.default'.3. The hard-coded default values.As a consequence, querying a source that doesn't exist doesn't error out,but returns the configured or hardcoded defaults. */
  source: InfraSource;
  /** Get a list of all infrastructure data sources */
  allSources: InfraSource[];
}
/** A source of infrastructure data */
export interface InfraSource {
  /** The id of the source */
  id: string;
  /** The version number the source configuration was last persisted with */
  version?: number | null;
  /** The timestamp the source configuration was last persisted at */
  updatedAt?: number | null;
  /** The raw configuration of the source */
  configuration: InfraSourceConfiguration;
  /** The status of the source */
  status: InfraSourceStatus;
  /** A hierarchy of metadata entries by node */
  metadataByNode: InfraNodeMetadata;
  /** A consecutive span of log entries surrounding a point in time */
  logEntriesAround: InfraLogEntryInterval;
  /** A consecutive span of log entries within an interval */
  logEntriesBetween: InfraLogEntryInterval;
  /** A consecutive span of summary buckets within an interval */
  logSummaryBetween: InfraLogSummaryInterval;

  logItem: InfraLogItem;
  /** A hierarchy of hosts, pods, containers, services or arbitrary groups */
  map?: InfraResponse | null;

  metrics: InfraMetricData[];
}
/** A set of configuration options for an infrastructure data source */
export interface InfraSourceConfiguration {
  /** The name of the data source */
  name: string;
  /** A description of the data source */
  description: string;
  /** The alias to read metric data from */
  metricAlias: string;
  /** The alias to read log data from */
  logAlias: string;
  /** The field mapping to use for this source */
  fields: InfraSourceFields;
}
/** A mapping of semantic fields to their document counterparts */
export interface InfraSourceFields {
  /** The field to identify a container by */
  container: string;
  /** The fields to identify a host by */
  host: string;
  /** The field to identify a pod by */
  pod: string;
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker: string;
  /** The field to use as a timestamp for metrics and logs */
  timestamp: string;
}
/** The status of an infrastructure data source */
export interface InfraSourceStatus {
  /** Whether the configured metric alias exists */
  metricAliasExists: boolean;
  /** Whether the configured log alias exists */
  logAliasExists: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any metric indices */
  metricIndicesExist: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any log indices */
  logIndicesExist: boolean;
  /** The list of indices in the metric alias */
  metricIndices: string[];
  /** The list of indices in the log alias */
  logIndices: string[];
  /** The list of fields defined in the index mappings */
  indexFields: InfraIndexField[];
}
/** A descriptor of a field in an index */
export interface InfraIndexField {
  /** The name of the field */
  name: string;
  /** The type of the field's values as recognized by Kibana */
  type: string;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
}
/** One metadata entry for a node. */
export interface InfraNodeMetadata {
  id: string;

  name: string;

  features: InfraNodeFeature[];
}

export interface InfraNodeFeature {
  name: string;

  source: string;
}
/** A consecutive sequence of log entries */
export interface InfraLogEntryInterval {
  /** The key corresponding to the start of the interval covered by the entries */
  start?: InfraTimeKey | null;
  /** The key corresponding to the end of the interval covered by the entries */
  end?: InfraTimeKey | null;
  /** Whether there are more log entries available before the start */
  hasMoreBefore: boolean;
  /** Whether there are more log entries available after the end */
  hasMoreAfter: boolean;
  /** The query the log entries were filtered by */
  filterQuery?: string | null;
  /** The query the log entries were highlighted with */
  highlightQuery?: string | null;
  /** A list of the log entries */
  entries: InfraLogEntry[];
}
/** A representation of the log entry's position in the event stream */
export interface InfraTimeKey {
  /** The timestamp of the event that the log entry corresponds to */
  time: number;
  /** The tiebreaker that disambiguates events with the same timestamp */
  tiebreaker: number;
}
/** A log entry */
export interface InfraLogEntry {
  /** A unique representation of the log entry's position in the event stream */
  key: InfraTimeKey;
  /** The log entry's id */
  gid: string;
  /** The source id */
  source: string;
  /** A list of the formatted log entry segments */
  message: InfraLogMessageSegment[];
}
/** A segment of the log entry message that was derived from a field */
export interface InfraLogMessageFieldSegment {
  /** The field the segment was derived from */
  field: string;
  /** The segment's message */
  value: string;
  /** A list of highlighted substrings of the value */
  highlights: string[];
}
/** A segment of the log entry message that was derived from a field */
export interface InfraLogMessageConstantSegment {
  /** The segment's message */
  constant: string;
}
/** A consecutive sequence of log summary buckets */
export interface InfraLogSummaryInterval {
  /** The millisecond timestamp corresponding to the start of the interval covered by the summary */
  start?: number | null;
  /** The millisecond timestamp corresponding to the end of the interval covered by the summary */
  end?: number | null;
  /** The query the log entries were filtered by */
  filterQuery?: string | null;
  /** A list of the log entries */
  buckets: InfraLogSummaryBucket[];
}
/** A log summary bucket */
export interface InfraLogSummaryBucket {
  /** The start timestamp of the bucket */
  start: number;
  /** The end timestamp of the bucket */
  end: number;
  /** The number of entries inside the bucket */
  entriesCount: number;
}

export interface InfraLogItem {
  /** The ID of the document */
  id: string;
  /** The index where the document was found */
  index: string;
  /** An array of flattened fields and values */
  fields: InfraLogItemField[];
}

export interface InfraLogItemField {
  /** The flattened field name */
  field: string;
  /** The value for the Field as a string */
  value: string;
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

  label: string;
}

export interface InfraNodeMetric {
  name: InfraMetricType;

  value: number;

  avg: number;

  max: number;
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

export interface Mutation {
  /** Create a new source of infrastructure data */
  createSource: CreateSourceResult;
  /** Modify an existing source using the given sequence of update operations */
  updateSource: UpdateSourceResult;
  /** Delete a source of infrastructure data */
  deleteSource: DeleteSourceResult;
}
/** The result of a successful source creation */
export interface CreateSourceResult {
  /** The source that was created */
  source: InfraSource;
}
/** The result of a sequence of source update operations */
export interface UpdateSourceResult {
  /** The source after the operations were performed */
  source: InfraSource;
}
/** The result of a source deletion operations */
export interface DeleteSourceResult {
  /** The id of the source that was deleted */
  id: string;
}

// ====================================================
// InputTypes
// ====================================================

export interface InfraTimeKeyInput {
  time: number;

  tiebreaker: number;
}

export interface InfraTimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: number;
  /** The beginning of the timerange */
  from: number;
}

export interface InfraPathInput {
  /** The type of path */
  type: InfraPathType;
  /** The label to use in the results for the group by for the terms group by */
  label?: string | null;
  /** The field to group by from a terms aggregation, this is ignored by the filter type */
  field?: string | null;
  /** The fitlers for the filter group by */
  filters?: InfraPathFilterInput[] | null;
}
/** A group by filter */
export interface InfraPathFilterInput {
  /** The label for the filter, this will be used as the group name in the final results */
  label: string;
  /** The query string query */
  query: string;
}

export interface InfraMetricInput {
  /** The type of metric */
  type: InfraMetricType;
}
/** The source to be created */
export interface CreateSourceInput {
  /** The name of the data source */
  name: string;
  /** A description of the data source */
  description?: string | null;
  /** The alias to read metric data from */
  metricAlias?: string | null;
  /** The alias to read log data from */
  logAlias?: string | null;
  /** The field mapping to use for this source */
  fields?: CreateSourceFieldsInput | null;
}
/** The mapping of semantic fields of the source to be created */
export interface CreateSourceFieldsInput {
  /** The field to identify a container by */
  container?: string | null;
  /** The fields to identify a host by */
  host?: string | null;
  /** The field to identify a pod by */
  pod?: string | null;
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker?: string | null;
  /** The field to use as a timestamp for metrics and logs */
  timestamp?: string | null;
}
/** The update operations to be performed */
export interface UpdateSourceInput {
  /** The name update operation to be performed */
  setName?: UpdateSourceNameInput | null;
  /** The description update operation to be performed */
  setDescription?: UpdateSourceDescriptionInput | null;
  /** The alias update operation to be performed */
  setAliases?: UpdateSourceAliasInput | null;
  /** The field update operation to be performed */
  setFields?: UpdateSourceFieldsInput | null;
}
/** A name update operation */
export interface UpdateSourceNameInput {
  /** The new name to be set */
  name: string;
}
/** A description update operation */
export interface UpdateSourceDescriptionInput {
  /** The new description to be set */
  description: string;
}
/** An alias update operation */
export interface UpdateSourceAliasInput {
  /** The new log index pattern or alias to bet set */
  logAlias?: string | null;
  /** The new metric index pattern or alias to bet set */
  metricAlias?: string | null;
}
/** A field update operations */
export interface UpdateSourceFieldsInput {
  /** The new container field to be set */
  container?: string | null;
  /** The new host field to be set */
  host?: string | null;
  /** The new pod field to be set */
  pod?: string | null;
  /** The new tiebreaker field to be set */
  tiebreaker?: string | null;
  /** The new timestamp field to be set */
  timestamp?: string | null;
}

// ====================================================
// Arguments
// ====================================================

export interface SourceQueryArgs {
  /** The id of the source */
  id: string;
}
export interface MetadataByNodeInfraSourceArgs {
  nodeId: string;

  nodeType: InfraNodeType;
}
export interface LogEntriesAroundInfraSourceArgs {
  /** The sort key that corresponds to the point in time */
  key: InfraTimeKeyInput;
  /** The maximum number of preceding to return */
  countBefore?: number | null;
  /** The maximum number of following to return */
  countAfter?: number | null;
  /** The query to filter the log entries by */
  filterQuery?: string | null;
  /** The query to highlight the log entries with */
  highlightQuery?: string | null;
}
export interface LogEntriesBetweenInfraSourceArgs {
  /** The sort key that corresponds to the start of the interval */
  startKey: InfraTimeKeyInput;
  /** The sort key that corresponds to the end of the interval */
  endKey: InfraTimeKeyInput;
  /** The query to filter the log entries by */
  filterQuery?: string | null;
  /** The query to highlight the log entries with */
  highlightQuery?: string | null;
}
export interface LogSummaryBetweenInfraSourceArgs {
  /** The millisecond timestamp that corresponds to the start of the interval */
  start: number;
  /** The millisecond timestamp that corresponds to the end of the interval */
  end: number;
  /** The size of each bucket in milliseconds */
  bucketSize: number;
  /** The query to filter the log entries by */
  filterQuery?: string | null;
}
export interface LogItemInfraSourceArgs {
  id: string;
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
export interface CreateSourceMutationArgs {
  /** The id of the source */
  id: string;

  source: CreateSourceInput;
}
export interface UpdateSourceMutationArgs {
  /** The id of the source */
  id: string;
  /** A sequence of update operations */
  changes: UpdateSourceInput[];
}
export interface DeleteSourceMutationArgs {
  /** The id of the source */
  id: string;
}

// ====================================================
// Enums
// ====================================================

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
  custom = 'custom',
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

// ====================================================
// Unions
// ====================================================

/** A segment of the log entry message */
export type InfraLogMessageSegment = InfraLogMessageFieldSegment | InfraLogMessageConstantSegment;

// ====================================================
// END: Typescript template
// ====================================================

// ====================================================
// Resolvers
// ====================================================

export namespace QueryResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = never> {
    /** Get an infrastructure data source by id.The resolution order for the source configuration attributes is as followswith the first defined value winning:1. The attributes of the saved object with the given 'id'.2. The attributes defined in the static Kibana configuration key'xpack.infra.sources.default'.3. The hard-coded default values.As a consequence, querying a source that doesn't exist doesn't error out,but returns the configured or hardcoded defaults. */
    source?: SourceResolver<InfraSource, TypeParent, Context>;
    /** Get a list of all infrastructure data sources */
    allSources?: AllSourcesResolver<InfraSource[], TypeParent, Context>;
  }

  export type SourceResolver<R = InfraSource, Parent = never, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context,
    SourceArgs
  >;
  export interface SourceArgs {
    /** The id of the source */
    id: string;
  }

  export type AllSourcesResolver<
    R = InfraSource[],
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A source of infrastructure data */
export namespace InfraSourceResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSource> {
    /** The id of the source */
    id?: IdResolver<string, TypeParent, Context>;
    /** The version number the source configuration was last persisted with */
    version?: VersionResolver<number | null, TypeParent, Context>;
    /** The timestamp the source configuration was last persisted at */
    updatedAt?: UpdatedAtResolver<number | null, TypeParent, Context>;
    /** The raw configuration of the source */
    configuration?: ConfigurationResolver<InfraSourceConfiguration, TypeParent, Context>;
    /** The status of the source */
    status?: StatusResolver<InfraSourceStatus, TypeParent, Context>;
    /** A hierarchy of metadata entries by node */
    metadataByNode?: MetadataByNodeResolver<InfraNodeMetadata, TypeParent, Context>;
    /** A consecutive span of log entries surrounding a point in time */
    logEntriesAround?: LogEntriesAroundResolver<InfraLogEntryInterval, TypeParent, Context>;
    /** A consecutive span of log entries within an interval */
    logEntriesBetween?: LogEntriesBetweenResolver<InfraLogEntryInterval, TypeParent, Context>;
    /** A consecutive span of summary buckets within an interval */
    logSummaryBetween?: LogSummaryBetweenResolver<InfraLogSummaryInterval, TypeParent, Context>;

    logItem?: LogItemResolver<InfraLogItem, TypeParent, Context>;
    /** A hierarchy of hosts, pods, containers, services or arbitrary groups */
    map?: MapResolver<InfraResponse | null, TypeParent, Context>;

    metrics?: MetricsResolver<InfraMetricData[], TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = InfraSource, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type VersionResolver<
    R = number | null,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedAtResolver<
    R = number | null,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ConfigurationResolver<
    R = InfraSourceConfiguration,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type StatusResolver<
    R = InfraSourceStatus,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetadataByNodeResolver<
    R = InfraNodeMetadata,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, MetadataByNodeArgs>;
  export interface MetadataByNodeArgs {
    nodeId: string;

    nodeType: InfraNodeType;
  }

  export type LogEntriesAroundResolver<
    R = InfraLogEntryInterval,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogEntriesAroundArgs>;
  export interface LogEntriesAroundArgs {
    /** The sort key that corresponds to the point in time */
    key: InfraTimeKeyInput;
    /** The maximum number of preceding to return */
    countBefore?: number | null;
    /** The maximum number of following to return */
    countAfter?: number | null;
    /** The query to filter the log entries by */
    filterQuery?: string | null;
    /** The query to highlight the log entries with */
    highlightQuery?: string | null;
  }

  export type LogEntriesBetweenResolver<
    R = InfraLogEntryInterval,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogEntriesBetweenArgs>;
  export interface LogEntriesBetweenArgs {
    /** The sort key that corresponds to the start of the interval */
    startKey: InfraTimeKeyInput;
    /** The sort key that corresponds to the end of the interval */
    endKey: InfraTimeKeyInput;
    /** The query to filter the log entries by */
    filterQuery?: string | null;
    /** The query to highlight the log entries with */
    highlightQuery?: string | null;
  }

  export type LogSummaryBetweenResolver<
    R = InfraLogSummaryInterval,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogSummaryBetweenArgs>;
  export interface LogSummaryBetweenArgs {
    /** The millisecond timestamp that corresponds to the start of the interval */
    start: number;
    /** The millisecond timestamp that corresponds to the end of the interval */
    end: number;
    /** The size of each bucket in milliseconds */
    bucketSize: number;
    /** The query to filter the log entries by */
    filterQuery?: string | null;
  }

  export type LogItemResolver<
    R = InfraLogItem,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogItemArgs>;
  export interface LogItemArgs {
    id: string;
  }

  export type MapResolver<
    R = InfraResponse | null,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, MapArgs>;
  export interface MapArgs {
    timerange: InfraTimerangeInput;

    filterQuery?: string | null;
  }

  export type MetricsResolver<
    R = InfraMetricData[],
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, MetricsArgs>;
  export interface MetricsArgs {
    nodeId: string;

    nodeType: InfraNodeType;

    timerange: InfraTimerangeInput;

    metrics: InfraMetric[];
  }
}
/** A set of configuration options for an infrastructure data source */
export namespace InfraSourceConfigurationResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceConfiguration> {
    /** The name of the data source */
    name?: NameResolver<string, TypeParent, Context>;
    /** A description of the data source */
    description?: DescriptionResolver<string, TypeParent, Context>;
    /** The alias to read metric data from */
    metricAlias?: MetricAliasResolver<string, TypeParent, Context>;
    /** The alias to read log data from */
    logAlias?: LogAliasResolver<string, TypeParent, Context>;
    /** The field mapping to use for this source */
    fields?: FieldsResolver<InfraSourceFields, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricAliasResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogAliasResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FieldsResolver<
    R = InfraSourceFields,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace InfraSourceFieldsResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceFields> {
    /** The field to identify a container by */
    container?: ContainerResolver<string, TypeParent, Context>;
    /** The fields to identify a host by */
    host?: HostResolver<string, TypeParent, Context>;
    /** The field to identify a pod by */
    pod?: PodResolver<string, TypeParent, Context>;
    /** The field to use as a tiebreaker for log events that have identical timestamps */
    tiebreaker?: TiebreakerResolver<string, TypeParent, Context>;
    /** The field to use as a timestamp for metrics and logs */
    timestamp?: TimestampResolver<string, TypeParent, Context>;
  }

  export type ContainerResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type PodResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type TiebreakerResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** The status of an infrastructure data source */
export namespace InfraSourceStatusResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceStatus> {
    /** Whether the configured metric alias exists */
    metricAliasExists?: MetricAliasExistsResolver<boolean, TypeParent, Context>;
    /** Whether the configured log alias exists */
    logAliasExists?: LogAliasExistsResolver<boolean, TypeParent, Context>;
    /** Whether the configured alias or wildcard pattern resolve to any metric indices */
    metricIndicesExist?: MetricIndicesExistResolver<boolean, TypeParent, Context>;
    /** Whether the configured alias or wildcard pattern resolve to any log indices */
    logIndicesExist?: LogIndicesExistResolver<boolean, TypeParent, Context>;
    /** The list of indices in the metric alias */
    metricIndices?: MetricIndicesResolver<string[], TypeParent, Context>;
    /** The list of indices in the log alias */
    logIndices?: LogIndicesResolver<string[], TypeParent, Context>;
    /** The list of fields defined in the index mappings */
    indexFields?: IndexFieldsResolver<InfraIndexField[], TypeParent, Context>;
  }

  export type MetricAliasExistsResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogAliasExistsResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricIndicesExistResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogIndicesExistResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricIndicesResolver<
    R = string[],
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogIndicesResolver<
    R = string[],
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type IndexFieldsResolver<
    R = InfraIndexField[],
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context, IndexFieldsArgs>;
  export interface IndexFieldsArgs {
    indexType?: InfraIndexType | null;
  }
}
/** A descriptor of a field in an index */
export namespace InfraIndexFieldResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraIndexField> {
    /** The name of the field */
    name?: NameResolver<string, TypeParent, Context>;
    /** The type of the field's values as recognized by Kibana */
    type?: TypeResolver<string, TypeParent, Context>;
    /** Whether the field's values can be efficiently searched for */
    searchable?: SearchableResolver<boolean, TypeParent, Context>;
    /** Whether the field's values can be aggregated */
    aggregatable?: AggregatableResolver<boolean, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = InfraIndexField, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = InfraIndexField, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SearchableResolver<
    R = boolean,
    Parent = InfraIndexField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type AggregatableResolver<
    R = boolean,
    Parent = InfraIndexField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** One metadata entry for a node. */
export namespace InfraNodeMetadataResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraNodeMetadata> {
    id?: IdResolver<string, TypeParent, Context>;

    name?: NameResolver<string, TypeParent, Context>;

    features?: FeaturesResolver<InfraNodeFeature[], TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = InfraNodeMetadata, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type NameResolver<
    R = string,
    Parent = InfraNodeMetadata,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FeaturesResolver<
    R = InfraNodeFeature[],
    Parent = InfraNodeMetadata,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraNodeFeatureResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraNodeFeature> {
    name?: NameResolver<string, TypeParent, Context>;

    source?: SourceResolver<string, TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = InfraNodeFeature,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = string,
    Parent = InfraNodeFeature,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A consecutive sequence of log entries */
export namespace InfraLogEntryIntervalResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogEntryInterval> {
    /** The key corresponding to the start of the interval covered by the entries */
    start?: StartResolver<InfraTimeKey | null, TypeParent, Context>;
    /** The key corresponding to the end of the interval covered by the entries */
    end?: EndResolver<InfraTimeKey | null, TypeParent, Context>;
    /** Whether there are more log entries available before the start */
    hasMoreBefore?: HasMoreBeforeResolver<boolean, TypeParent, Context>;
    /** Whether there are more log entries available after the end */
    hasMoreAfter?: HasMoreAfterResolver<boolean, TypeParent, Context>;
    /** The query the log entries were filtered by */
    filterQuery?: FilterQueryResolver<string | null, TypeParent, Context>;
    /** The query the log entries were highlighted with */
    highlightQuery?: HighlightQueryResolver<string | null, TypeParent, Context>;
    /** A list of the log entries */
    entries?: EntriesResolver<InfraLogEntry[], TypeParent, Context>;
  }

  export type StartResolver<
    R = InfraTimeKey | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type EndResolver<
    R = InfraTimeKey | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HasMoreBeforeResolver<
    R = boolean,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HasMoreAfterResolver<
    R = boolean,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FilterQueryResolver<
    R = string | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HighlightQueryResolver<
    R = string | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type EntriesResolver<
    R = InfraLogEntry[],
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A representation of the log entry's position in the event stream */
export namespace InfraTimeKeyResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraTimeKey> {
    /** The timestamp of the event that the log entry corresponds to */
    time?: TimeResolver<number, TypeParent, Context>;
    /** The tiebreaker that disambiguates events with the same timestamp */
    tiebreaker?: TiebreakerResolver<number, TypeParent, Context>;
  }

  export type TimeResolver<R = number, Parent = InfraTimeKey, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TiebreakerResolver<
    R = number,
    Parent = InfraTimeKey,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A log entry */
export namespace InfraLogEntryResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogEntry> {
    /** A unique representation of the log entry's position in the event stream */
    key?: KeyResolver<InfraTimeKey, TypeParent, Context>;
    /** The log entry's id */
    gid?: GidResolver<string, TypeParent, Context>;
    /** The source id */
    source?: SourceResolver<string, TypeParent, Context>;
    /** A list of the formatted log entry segments */
    message?: MessageResolver<InfraLogMessageSegment[], TypeParent, Context>;
  }

  export type KeyResolver<
    R = InfraTimeKey,
    Parent = InfraLogEntry,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type GidResolver<R = string, Parent = InfraLogEntry, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SourceResolver<R = string, Parent = InfraLogEntry, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MessageResolver<
    R = InfraLogMessageSegment[],
    Parent = InfraLogEntry,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A segment of the log entry message that was derived from a field */
export namespace InfraLogMessageFieldSegmentResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogMessageFieldSegment> {
    /** The field the segment was derived from */
    field?: FieldResolver<string, TypeParent, Context>;
    /** The segment's message */
    value?: ValueResolver<string, TypeParent, Context>;
    /** A list of highlighted substrings of the value */
    highlights?: HighlightsResolver<string[], TypeParent, Context>;
  }

  export type FieldResolver<
    R = string,
    Parent = InfraLogMessageFieldSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = string,
    Parent = InfraLogMessageFieldSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HighlightsResolver<
    R = string[],
    Parent = InfraLogMessageFieldSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A segment of the log entry message that was derived from a field */
export namespace InfraLogMessageConstantSegmentResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogMessageConstantSegment> {
    /** The segment's message */
    constant?: ConstantResolver<string, TypeParent, Context>;
  }

  export type ConstantResolver<
    R = string,
    Parent = InfraLogMessageConstantSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A consecutive sequence of log summary buckets */
export namespace InfraLogSummaryIntervalResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogSummaryInterval> {
    /** The millisecond timestamp corresponding to the start of the interval covered by the summary */
    start?: StartResolver<number | null, TypeParent, Context>;
    /** The millisecond timestamp corresponding to the end of the interval covered by the summary */
    end?: EndResolver<number | null, TypeParent, Context>;
    /** The query the log entries were filtered by */
    filterQuery?: FilterQueryResolver<string | null, TypeParent, Context>;
    /** A list of the log entries */
    buckets?: BucketsResolver<InfraLogSummaryBucket[], TypeParent, Context>;
  }

  export type StartResolver<
    R = number | null,
    Parent = InfraLogSummaryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type EndResolver<
    R = number | null,
    Parent = InfraLogSummaryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FilterQueryResolver<
    R = string | null,
    Parent = InfraLogSummaryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type BucketsResolver<
    R = InfraLogSummaryBucket[],
    Parent = InfraLogSummaryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A log summary bucket */
export namespace InfraLogSummaryBucketResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogSummaryBucket> {
    /** The start timestamp of the bucket */
    start?: StartResolver<number, TypeParent, Context>;
    /** The end timestamp of the bucket */
    end?: EndResolver<number, TypeParent, Context>;
    /** The number of entries inside the bucket */
    entriesCount?: EntriesCountResolver<number, TypeParent, Context>;
  }

  export type StartResolver<
    R = number,
    Parent = InfraLogSummaryBucket,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type EndResolver<
    R = number,
    Parent = InfraLogSummaryBucket,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type EntriesCountResolver<
    R = number,
    Parent = InfraLogSummaryBucket,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraLogItemResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogItem> {
    /** The ID of the document */
    id?: IdResolver<string, TypeParent, Context>;
    /** The index where the document was found */
    index?: IndexResolver<string, TypeParent, Context>;
    /** An array of flattened fields and values */
    fields?: FieldsResolver<InfraLogItemField[], TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = InfraLogItem, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IndexResolver<R = string, Parent = InfraLogItem, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FieldsResolver<
    R = InfraLogItemField[],
    Parent = InfraLogItem,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraLogItemFieldResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogItemField> {
    /** The flattened field name */
    field?: FieldResolver<string, TypeParent, Context>;
    /** The value for the Field as a string */
    value?: ValueResolver<string, TypeParent, Context>;
  }

  export type FieldResolver<
    R = string,
    Parent = InfraLogItemField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = string,
    Parent = InfraLogItemField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraResponseResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraResponse> {
    nodes?: NodesResolver<InfraNode[], TypeParent, Context>;
  }

  export type NodesResolver<
    R = InfraNode[],
    Parent = InfraResponse,
    Context = InfraContext
  > = Resolver<R, Parent, Context, NodesArgs>;
  export interface NodesArgs {
    path: InfraPathInput[];

    metric: InfraMetricInput;
  }
}

export namespace InfraNodeResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraNode> {
    path?: PathResolver<InfraNodePath[], TypeParent, Context>;

    metric?: MetricResolver<InfraNodeMetric, TypeParent, Context>;
  }

  export type PathResolver<
    R = InfraNodePath[],
    Parent = InfraNode,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricResolver<
    R = InfraNodeMetric,
    Parent = InfraNode,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraNodePathResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraNodePath> {
    value?: ValueResolver<string, TypeParent, Context>;

    label?: LabelResolver<string, TypeParent, Context>;
  }

  export type ValueResolver<R = string, Parent = InfraNodePath, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type LabelResolver<R = string, Parent = InfraNodePath, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace InfraNodeMetricResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraNodeMetric> {
    name?: NameResolver<InfraMetricType, TypeParent, Context>;

    value?: ValueResolver<number, TypeParent, Context>;

    avg?: AvgResolver<number, TypeParent, Context>;

    max?: MaxResolver<number, TypeParent, Context>;
  }

  export type NameResolver<
    R = InfraMetricType,
    Parent = InfraNodeMetric,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = number,
    Parent = InfraNodeMetric,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type AvgResolver<R = number, Parent = InfraNodeMetric, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MaxResolver<R = number, Parent = InfraNodeMetric, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace InfraMetricDataResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraMetricData> {
    id?: IdResolver<InfraMetric | null, TypeParent, Context>;

    series?: SeriesResolver<InfraDataSeries[], TypeParent, Context>;
  }

  export type IdResolver<
    R = InfraMetric | null,
    Parent = InfraMetricData,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type SeriesResolver<
    R = InfraDataSeries[],
    Parent = InfraMetricData,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraDataSeriesResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraDataSeries> {
    id?: IdResolver<string, TypeParent, Context>;

    data?: DataResolver<InfraDataPoint[], TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = InfraDataSeries, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DataResolver<
    R = InfraDataPoint[],
    Parent = InfraDataSeries,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraDataPointResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraDataPoint> {
    timestamp?: TimestampResolver<number, TypeParent, Context>;

    value?: ValueResolver<number | null, TypeParent, Context>;
  }

  export type TimestampResolver<
    R = number,
    Parent = InfraDataPoint,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = number | null,
    Parent = InfraDataPoint,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace MutationResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = never> {
    /** Create a new source of infrastructure data */
    createSource?: CreateSourceResolver<CreateSourceResult, TypeParent, Context>;
    /** Modify an existing source using the given sequence of update operations */
    updateSource?: UpdateSourceResolver<UpdateSourceResult, TypeParent, Context>;
    /** Delete a source of infrastructure data */
    deleteSource?: DeleteSourceResolver<DeleteSourceResult, TypeParent, Context>;
  }

  export type CreateSourceResolver<
    R = CreateSourceResult,
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context, CreateSourceArgs>;
  export interface CreateSourceArgs {
    /** The id of the source */
    id: string;

    source: CreateSourceInput;
  }

  export type UpdateSourceResolver<
    R = UpdateSourceResult,
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context, UpdateSourceArgs>;
  export interface UpdateSourceArgs {
    /** The id of the source */
    id: string;
    /** A sequence of update operations */
    changes: UpdateSourceInput[];
  }

  export type DeleteSourceResolver<
    R = DeleteSourceResult,
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context, DeleteSourceArgs>;
  export interface DeleteSourceArgs {
    /** The id of the source */
    id: string;
  }
}
/** The result of a successful source creation */
export namespace CreateSourceResultResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = CreateSourceResult> {
    /** The source that was created */
    source?: SourceResolver<InfraSource, TypeParent, Context>;
  }

  export type SourceResolver<
    R = InfraSource,
    Parent = CreateSourceResult,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** The result of a sequence of source update operations */
export namespace UpdateSourceResultResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = UpdateSourceResult> {
    /** The source after the operations were performed */
    source?: SourceResolver<InfraSource, TypeParent, Context>;
  }

  export type SourceResolver<
    R = InfraSource,
    Parent = UpdateSourceResult,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** The result of a source deletion operations */
export namespace DeleteSourceResultResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = DeleteSourceResult> {
    /** The id of the source that was deleted */
    id?: IdResolver<string, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = DeleteSourceResult,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
