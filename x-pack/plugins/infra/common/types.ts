/* tslint:disable */

export interface InfraField {
  name?: string | null;
  type?: string | null;
  searchable?: boolean | null;
  aggregatable?: boolean | null;
}

export interface Query {
  map?: InfraResponse | null;
  fields?: (InfraField | null)[] | null;
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
  filters?: (InfraFilter | null)[] | null;
}
export interface FieldsQueryArgs {
  indexPattern?: InfraIndexPattern | null;
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
