/* tslint:disable */

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
// Documents
// ====================================================

export namespace FlyoutItemQuery {
  export type Variables = {
    sourceId: string;
    itemId: string;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    id: string;

    logItem: LogItem;
  };

  export type LogItem = {
    __typename?: 'InfraLogItem';

    id: string;

    index: string;

    fields: Fields[];
  };

  export type Fields = {
    __typename?: 'InfraLogItemField';

    field: string;

    value: string;
  };
}

export namespace MetadataQuery {
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

    metadataByNode: MetadataByNode;
  };

  export type MetadataByNode = {
    __typename?: 'InfraNodeMetadata';

    name: string;

    features: Features[];
  };

  export type Features = {
    __typename?: 'InfraNodeFeature';

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

    label: string;
  };

  export type Metric = {
    __typename?: 'InfraNodeMetric';

    name: InfraMetricType;

    value: number;

    avg: number;

    max: number;
  };
}

export namespace CreateSourceMutation {
  export type Variables = {
    sourceId: string;
    sourceConfiguration: CreateSourceInput;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    createSource: CreateSource;
  };

  export type CreateSource = {
    __typename?: 'CreateSourceResult';

    source: Source;
  };

  export type Source = SourceFields.Fragment;
}

export namespace SourceQuery {
  export type Variables = {
    sourceId?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = SourceFields.Fragment;
}

export namespace UpdateSourceMutation {
  export type Variables = {
    sourceId?: string | null;
    changes: UpdateSourceInput[];
  };

  export type Mutation = {
    __typename?: 'Mutation';

    updateSource: UpdateSource;
  };

  export type UpdateSource = {
    __typename?: 'UpdateSourceResult';

    source: Source;
  };

  export type Source = SourceFields.Fragment;
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

export namespace SourceFields {
  export type Fragment = {
    __typename?: 'InfraSource';

    id: string;

    version?: number | null;

    updatedAt?: number | null;

    configuration: Configuration;

    status: Status;
  };

  export type Configuration = {
    __typename?: 'InfraSourceConfiguration';

    name: string;

    description: string;

    metricAlias: string;

    logAlias: string;

    fields: Fields;
  };

  export type Fields = {
    __typename?: 'InfraSourceFields';

    container: string;

    host: string;

    pod: string;

    tiebreaker: string;

    timestamp: string;
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
