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

  getMonitorChartsData?: (MonitorChartEntry | null)[] | null;

  getLatestMonitors: Ping[];

  getFilterBar?: FilterBar | null;

  getErrorsList?: (ErrorListItem | null)[] | null;
}

export interface PingResults {
  total: UnsignedInteger;

  pings: Ping[];
}
/** A request sent from a monitor to a host */
export interface Ping {
  /** The timestamp of the ping's creation */
  timestamp: string;
  /** The agent that recorded the ping */
  beat?: Beat | null;

  docker?: Docker | null;

  error?: Error | null;

  host?: Host | null;

  http?: Http | null;

  icmp?: Icmp | null;

  kubernetes?: Kubernetes | null;

  meta?: Meta | null;

  monitor?: Monitor | null;

  resolve?: Resolve | null;

  socks5?: Socks5 | null;

  tags?: string | null;

  tcp?: Tcp | null;

  tls?: Tls | null;
}
/** An agent for recording a beat */
export interface Beat {
  hostname?: string | null;

  name?: string | null;

  timezone?: string | null;

  type?: string | null;
}

export interface Docker {
  id?: string | null;

  image?: string | null;

  name?: string | null;
}

export interface Error {
  code?: number | null;

  message?: string | null;

  type?: string | null;
}

export interface Host {
  architecture?: string | null;

  id?: string | null;

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
  us?: number | null;
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

export interface DocCount {
  count: UnsignedInteger;
}

export interface LatestMonitorsResult {
  monitors?: (LatestMonitor | null)[] | null;
}

export interface LatestMonitor {
  key?: MonitorKey | null;

  ping?: Ping | null;

  upSeries?: (MonitorSeriesPoint | null)[] | null;

  downSeries?: (MonitorSeriesPoint | null)[] | null;
}

export interface MonitorKey {
  id?: string | null;

  port?: number | null;
}

export interface MonitorSeriesPoint {
  x?: UnsignedInteger | null;

  y?: number | null;
}

export interface Snapshot {
  up?: number | null;

  down?: number | null;

  trouble?: number | null;

  total?: number | null;

  histogram?: (HistogramSeries | null)[] | null;
}

export interface HistogramSeries {
  monitorId?: string | null;

  data?: (HistogramDataPoint | null)[] | null;
}

export interface HistogramDataPoint {
  upCount?: number | null;

  downCount?: number | null;

  x?: UnsignedInteger | null;

  x0?: UnsignedInteger | null;

  y?: UnsignedInteger | null;
}

export interface MonitorChartEntry {
  maxContent?: DataPoint | null;

  maxResponse?: DataPoint | null;

  maxValidate?: DataPoint | null;

  maxTotal?: DataPoint | null;

  maxWriteRequest?: DataPoint | null;

  maxTcpRtt?: DataPoint | null;

  maxDuration?: DataPoint | null;

  minDuration?: DataPoint | null;

  avgDuration?: DataPoint | null;

  status?: StatusData | null;
}

export interface DataPoint {
  x?: UnsignedInteger | null;

  y?: number | null;
}

export interface StatusData {
  x?: UnsignedInteger | null;

  up?: number | null;

  down?: number | null;

  total?: number | null;
}

export interface FilterBar {
  id?: (string | null)[] | null;

  port?: (number | null)[] | null;

  scheme?: (string | null)[] | null;

  status?: (string | null)[] | null;
}

export interface ErrorListItem {
  latestMessage?: string | null;

  monitorId?: string | null;

  type: string;

  count?: number | null;

  statusCode?: string | null;

  timestamp?: string | null;
}

// ====================================================
// Arguments
// ====================================================

export interface AllPingsQueryArgs {
  sort?: string | null;

  size?: number | null;

  monitorId?: string | null;

  status?: string | null;

  dateRangeStart: UnsignedInteger;

  dateRangeEnd: UnsignedInteger;
}
export interface GetMonitorsQueryArgs {
  dateRangeStart: UnsignedInteger;

  dateRangeEnd: UnsignedInteger;

  filters?: string | null;
}
export interface GetSnapshotQueryArgs {
  dateRangeStart?: UnsignedInteger | null;

  dateRangeEnd?: UnsignedInteger | null;

  downCount?: number | null;

  windowSize?: number | null;

  filters?: string | null;
}
export interface GetMonitorChartsDataQueryArgs {
  monitorId?: string | null;

  dateRangeStart?: UnsignedInteger | null;

  dateRangeEnd?: UnsignedInteger | null;
}
export interface GetLatestMonitorsQueryArgs {
  dateRangeStart: UnsignedInteger;

  dateRangeEnd: UnsignedInteger;

  monitorId?: string | null;
}
export interface GetFilterBarQueryArgs {
  dateRangeStart: UnsignedInteger;

  dateRangeEnd: UnsignedInteger;
}
export interface GetErrorsListQueryArgs {
  dateRangeStart: UnsignedInteger;

  dateRangeEnd: UnsignedInteger;

  filters?: string | null;
}

// ====================================================
// END: Typescript template
// ====================================================
