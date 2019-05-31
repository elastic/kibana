/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* tslint:disable */

// ====================================================
// START: Typescript template
// ====================================================

// ====================================================
// Scalars
// ====================================================

export type UnsignedInteger = any;

// ====================================================
// Types
// ====================================================

export interface Query {
  /** Get a list of all recorded pings for all monitors */
  allPings: PingResults;
  /** Gets the number of documents in the target index */
  getDocCount: DocCount;

  getMonitors?: LatestMonitorsResult | null;

  getSnapshot?: Snapshot | null;

  getMonitorChartsData?: MonitorChart | null;
  /** Fetch the most recent event data for a monitor ID, date range, location. */
  getLatestMonitors: Ping[];

  getFilterBar?: FilterBar | null;

  getErrorsList?: ErrorListItem[] | null;

  getMonitorPageTitle?: MonitorPageTitle | null;
}

export interface PingResults {
  total: UnsignedInteger;

  pings: Ping[];
}
/** A request sent from a monitor to a host */
export interface Ping {
  /** The timestamp of the ping's creation */
  timestamp: string;
  /** Milliseconds from the timestamp to the current time */
  millisFromNow?: string | null;
  /** The agent that recorded the ping */
  beat?: Beat | null;

  container?: Container | null;

  docker?: Docker | null;

  ecs?: Ecs | null;

  error?: Error | null;

  host?: Host | null;

  http?: Http | null;

  icmp?: Icmp | null;

  kubernetes?: Kubernetes | null;

  meta?: Meta | null;

  monitor?: Monitor | null;

  observer?: Observer | null;

  resolve?: Resolve | null;

  socks5?: Socks5 | null;

  summary?: Summary | null;

  tags?: string | null;

  tcp?: Tcp | null;

  tls?: Tls | null;

  url?: Url | null;
}
/** An agent for recording a beat */
export interface Beat {
  hostname?: string | null;

  name?: string | null;

  timezone?: string | null;

  type?: string | null;
}

export interface Container {
  id?: string | null;

  image?: ContainerImage | null;

  name?: string | null;

  runtime?: string | null;
}

export interface ContainerImage {
  name?: string | null;

  tag?: string | null;
}

export interface Docker {
  id?: string | null;

  image?: string | null;

  name?: string | null;
}

export interface Ecs {
  version?: string | null;
}

export interface Error {
  code?: number | null;

  message?: string | null;

  type?: string | null;
}

export interface Host {
  architecture?: string | null;

  id?: string | null;

  hostname?: string | null;

  ip?: string | null;

  mac?: string | null;

  name?: string | null;

  os?: Os | null;
}

export interface Os {
  family?: string | null;

  kernel?: string | null;

  platform?: string | null;

  version?: string | null;

  name?: string | null;

  build?: string | null;
}

export interface Http {
  response?: StatusCode | null;

  rtt?: HttpRtt | null;

  url?: string | null;
}

export interface StatusCode {
  status_code?: number | null;
}

export interface HttpRtt {
  content?: Duration | null;

  response_header?: Duration | null;

  total?: Duration | null;

  validate?: Duration | null;

  validate_body?: Duration | null;

  write_request?: Duration | null;
}
/** The monitor's status for a ping */
export interface Duration {
  us?: UnsignedInteger | null;
}

export interface Icmp {
  requests?: number | null;

  rtt?: number | null;
}

export interface Kubernetes {
  container?: KubernetesContainer | null;

  namespace?: string | null;

  node?: KubernetesNode | null;

  pod?: KubernetesPod | null;
}

export interface KubernetesContainer {
  image?: string | null;

  name?: string | null;
}

export interface KubernetesNode {
  name?: string | null;
}

export interface KubernetesPod {
  name?: string | null;

  uid?: string | null;
}

export interface Meta {
  cloud?: MetaCloud | null;
}

export interface MetaCloud {
  availability_zone?: string | null;

  instance_id?: string | null;

  instance_name?: string | null;

  machine_type?: string | null;

  project_id?: string | null;

  provider?: string | null;

  region?: string | null;
}

export interface Monitor {
  duration?: Duration | null;

  host?: string | null;
  /** The id of the monitor */
  id?: string | null;
  /** The IP pinged by the monitor */
  ip?: string | null;
  /** The name of the protocol being monitored */
  name?: string | null;
  /** The protocol scheme of the monitored host */
  scheme?: string | null;
  /** The status of the monitored host */
  status?: string | null;
  /** The type of host being monitored */
  type?: string | null;

  check_group?: string | null;
}
/** Metadata added by a proccessor, which is specified in its configuration. */
export interface Observer {
  /** Geolocation data for the agent. */
  geo?: Geo | null;
}
/** Geolocation data added via processors to enrich events. */
export interface Geo {
  /** Name of the city in which the agent is running. */
  city_name?: string | null;
  /** The name of the continent on which the agent is running. */
  continent_name?: string | null;
  /** ISO designation for the agent's country. */
  country_iso_code?: string | null;
  /** The name of the agent's country. */
  country_name?: string | null;
  /** The lat/long of the agent. */
  location?: string | null;
  /** A name for the host's location, e.g. 'us-east-1' or 'LAX'. */
  name?: string | null;
  /** ISO designation of the agent's region. */
  region_iso_code?: string | null;
  /** Name of the region hosting the agent. */
  region_name?: string | null;
}

export interface Resolve {
  host?: string | null;

  ip?: string | null;

  rtt?: Duration | null;
}

export interface Socks5 {
  rtt?: Rtt | null;
}

export interface Rtt {
  connect?: Duration | null;

  handshake?: Duration | null;

  validate?: Duration | null;
}

export interface Summary {
  up?: number | null;

  down?: number | null;
}

export interface Tcp {
  port?: number | null;

  rtt?: Rtt | null;
}

export interface Tls {
  certificate_not_valid_after?: string | null;

  certificate_not_valid_before?: string | null;

  certificates?: string | null;

  rtt?: Rtt | null;
}

export interface Url {
  full?: string | null;

  scheme?: string | null;

  domain?: string | null;

  port?: number | null;

  path?: string | null;

  query?: string | null;
}

export interface DocCount {
  count: UnsignedInteger;
}

export interface LatestMonitorsResult {
  monitors?: LatestMonitor[] | null;
}
/** Represents the latest recorded information about a monitor. */
export interface LatestMonitor {
  /** The ID of the monitor represented by this data. */
  id: MonitorKey;
  /** Information from the latest document. */
  ping?: Ping | null;
  /** Buckets of recent up count status data. */
  upSeries?: MonitorSeriesPoint[] | null;
  /** Buckets of recent down count status data. */
  downSeries?: MonitorSeriesPoint[] | null;
}

export interface MonitorKey {
  key: string;

  url?: string | null;
}

export interface MonitorSeriesPoint {
  x?: UnsignedInteger | null;

  y?: number | null;
}

export interface Snapshot {
  up?: number | null;

  down?: number | null;

  total?: number | null;

  histogram: HistogramDataPoint[];
}

export interface HistogramDataPoint {
  upCount?: number | null;

  downCount?: number | null;

  x?: UnsignedInteger | null;

  x0?: UnsignedInteger | null;

  y?: UnsignedInteger | null;
}
/** The data used to populate the monitor charts. */
export interface MonitorChart {
  /** The max and min values for the monitor duration. */
  durationArea: MonitorDurationAreaPoint[];
  /** The average values for the monitor duration. */
  durationLine: MonitorDurationAveragePoint[];
  /** The counts of up/down checks for the monitor. */
  status: StatusData[];
  /** The maximum status doc count in this chart. */
  statusMaxCount: number;
  /** The maximum duration value in this chart. */
  durationMaxValue: number;
}
/** Represents a monitor's duration performance in microseconds at a point in time. */
export interface MonitorDurationAreaPoint {
  /** The timeseries value for this point in time. */
  x: UnsignedInteger;
  /** The min duration value in microseconds at this time. */
  yMin?: number | null;
  /** The max duration value in microseconds at this point. */
  yMax?: number | null;
}
/** Represents the average monitor duration ms at a point in time. */
export interface MonitorDurationAveragePoint {
  /** The timeseries value for this point. */
  x: UnsignedInteger;
  /** The average duration ms for the monitor. */
  y?: number | null;
}
/** Represents a bucket of monitor status information. */
export interface StatusData {
  /** The timeseries point for this status data. */
  x: UnsignedInteger;
  /** The value of up counts for this point. */
  up?: number | null;
  /** The value for down counts for this point. */
  down?: number | null;
  /** The total down counts for this point. */
  total?: number | null;
}
/** The data used to enrich the filter bar. */
export interface FilterBar {
  /** A series of monitor IDs in the heartbeat indices. */
  ids?: MonitorKey[] | null;
  /** The location values users have configured for the agents. */
  locations?: string[] | null;
  /** The names users have configured for the monitors. */
  names?: string[] | null;
  /** The ports of the monitored endpoints. */
  ports?: number[] | null;
  /** The schemes used by the monitors. */
  schemes?: string[] | null;
  /** The possible status values contained in the indices. */
  statuses?: string[] | null;
}
/** A representation of an error state for a monitor. */
export interface ErrorListItem {
  /** The number of times this error has occurred. */
  count: number;
  /** The most recent message associated with this error type. */
  latestMessage?: string | null;
  /** The location assigned to the agent reporting this error. */
  location?: string | null;
  /** The ID of the monitor reporting the error. */
  monitorId?: string | null;
  /** The name configured for the monitor by the user. */
  name?: string | null;
  /** The status code, if available, of the error request. */
  statusCode?: string | null;
  /** When the most recent error state occurred. */
  timestamp?: string | null;
  /** What kind of error the monitor reported. */
  type: string;
}

export interface MonitorPageTitle {
  id: string;

  url?: string | null;

  name?: string | null;
}

export interface DataPoint {
  x?: UnsignedInteger | null;

  y?: number | null;
}

// ====================================================
// Arguments
// ====================================================

export interface AllPingsQueryArgs {
  /** Optional: the direction to sort by. Accepts 'asc' and 'desc'. Defaults to 'desc'. */
  sort?: string | null;
  /** Optional: the number of results to return. */
  size?: number | null;
  /** Optional: the monitor ID filter. */
  monitorId?: string | null;
  /** Optional: the check status to filter by. */
  status?: string | null;
  /** The lower limit of the date range. */
  dateRangeStart: string;
  /** The upper limit of the date range. */
  dateRangeEnd: string;
  /** Optional: agent location to filter by. */
  location?: string | null;
}
export interface GetMonitorsQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;

  filters?: string | null;
}
export interface GetSnapshotQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;

  filters?: string | null;
}
export interface GetMonitorChartsDataQueryArgs {
  monitorId: string;

  dateRangeStart: string;

  dateRangeEnd: string;

  location?: string | null;
}
export interface GetLatestMonitorsQueryArgs {
  /** The lower limit of the date range. */
  dateRangeStart: string;
  /** The upper limit of the date range. */
  dateRangeEnd: string;
  /** Optional: a specific monitor ID filter. */
  monitorId?: string | null;
  /** Optional: a specific instance location filter. */
  location?: string | null;
}
export interface GetFilterBarQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;
}
export interface GetErrorsListQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;

  filters?: string | null;
}
export interface GetMonitorPageTitleQueryArgs {
  monitorId: string;
}

// ====================================================
// END: Typescript template
// ====================================================
