/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDataType, ReportViewTypeId } from '../../types';
import { CLS_FIELD, FCP_FIELD, FID_FIELD, LCP_FIELD, TBT_FIELD } from './elasticsearch_fieldnames';
import {
  AGENT_HOST_LABEL,
  BROWSER_FAMILY_LABEL,
  BROWSER_VERSION_LABEL,
  CLS_LABEL,
  CPU_USAGE_LABEL,
  DEVICE_LABEL,
  ENVIRONMENT_LABEL,
  FCP_LABEL,
  FID_LABEL,
  HOST_NAME_LABEL,
  KIP_OVER_TIME_LABEL,
  KPI_LABEL,
  LCP_LABEL,
  LOCATION_LABEL,
  LOGS_FREQUENCY_LABEL,
  MEMORY_USAGE_LABEL,
  METRIC_LABEL,
  MONITOR_DURATION_LABEL,
  MONITOR_ID_LABEL,
  MONITOR_NAME_LABEL,
  MONITOR_STATUS_LABEL,
  MONITOR_TYPE_LABEL,
  NETWORK_ACTIVITY_LABEL,
  OBSERVER_LOCATION_LABEL,
  OS_LABEL,
  PERF_DIST_LABEL,
  PORT_LABEL,
  SERVICE_LATENCY_LABEL,
  SERVICE_NAME_LABEL,
  SERVICE_THROUGHPUT_LABEL,
  TAGS_LABEL,
  TBT_LABEL,
  UPTIME_PINGS_LABEL,
  URL_LABEL,
} from './labels';

export const DEFAULT_TIME = { from: 'now-1h', to: 'now' };

export const RECORDS_FIELD = 'Records';

export const FieldLabels: Record<string, string> = {
  'user_agent.name': BROWSER_FAMILY_LABEL,
  'user_agent.version': BROWSER_VERSION_LABEL,
  'user_agent.os.name': OS_LABEL,
  'client.geo.country_name': LOCATION_LABEL,
  'user_agent.device.name': DEVICE_LABEL,
  'observer.geo.name': OBSERVER_LOCATION_LABEL,
  'service.name': SERVICE_NAME_LABEL,
  'service.environment': ENVIRONMENT_LABEL,

  [LCP_FIELD]: LCP_LABEL,
  [FCP_FIELD]: FCP_LABEL,
  [TBT_FIELD]: TBT_LABEL,
  [FID_FIELD]: FID_LABEL,
  [CLS_FIELD]: CLS_LABEL,

  'monitor.id': MONITOR_ID_LABEL,
  'monitor.status': MONITOR_STATUS_LABEL,

  'agent.hostname': AGENT_HOST_LABEL,
  'host.hostname': HOST_NAME_LABEL,
  'monitor.name': MONITOR_NAME_LABEL,
  'monitor.type': MONITOR_TYPE_LABEL,
  'url.port': PORT_LABEL,
  'url.full': URL_LABEL,
  tags: TAGS_LABEL,

  // custom

  'performance.metric': METRIC_LABEL,
  'Business.KPI': KPI_LABEL,
};

export const DataViewLabels: Record<ReportViewTypeId, string> = {
  pld: PERF_DIST_LABEL,
  upd: MONITOR_DURATION_LABEL,
  upp: UPTIME_PINGS_LABEL,
  svl: SERVICE_LATENCY_LABEL,
  kpi: KIP_OVER_TIME_LABEL,
  tpt: SERVICE_THROUGHPUT_LABEL,
  cpu: CPU_USAGE_LABEL,
  logs: LOGS_FREQUENCY_LABEL,
  mem: MEMORY_USAGE_LABEL,
  nwk: NETWORK_ACTIVITY_LABEL,
};

export const ReportToDataTypeMap: Record<ReportViewTypeId, AppDataType> = {
  upd: 'synthetics',
  upp: 'synthetics',
  tpt: 'apm',
  svl: 'apm',
  kpi: 'ux',
  pld: 'ux',
  nwk: 'infra_metrics',
  mem: 'infra_metrics',
  logs: 'infra_logs',
  cpu: 'infra_metrics',
};
