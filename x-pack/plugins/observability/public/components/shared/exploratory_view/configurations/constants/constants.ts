/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportViewTypeId } from '../../types';
import { CLS_FIELD, FCP_FIELD, FID_FIELD, LCP_FIELD, TBT_FIELD } from './elasticsearch_fieldnames';
import {
  AGENT_HOST_LABEL,
  BROWSER_FAMILY_LABEL,
  BROWSER_VERSION_LABEL,
  CARRIER_LOCATION,
  CARRIER_NAME,
  CLS_LABEL,
  CONNECTION_TYPE,
  CORE_WEB_VITALS_LABEL,
  DEVICE_LABEL,
  DEVICE_MODEL,
  ENVIRONMENT_LABEL,
  FCP_LABEL,
  FID_LABEL,
  HOST_NAME_LABEL,
  HOST_OS,
  KIP_OVER_TIME_LABEL,
  KPI_LABEL,
  LCP_LABEL,
  LOCATION_LABEL,
  METRIC_LABEL,
  MONITOR_ID_LABEL,
  MONITOR_NAME_LABEL,
  MONITOR_STATUS_LABEL,
  MONITOR_TYPE_LABEL,
  OBSERVER_LOCATION_LABEL,
  OS_LABEL,
  OS_PLATFORM,
  PERF_DIST_LABEL,
  PORT_LABEL,
  REQUEST_METHOD,
  SERVICE_NAME_LABEL,
  SERVICE_VERSION,
  TAGS_LABEL,
  TBT_LABEL,
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

  'labels.net_connection_carrier_name': CARRIER_NAME,
  'http.request.method': REQUEST_METHOD,
  'labels.net_connection_type': CONNECTION_TYPE,
  'host.os.full': HOST_OS,
  'service.version': SERVICE_VERSION,
  'host.os.platform': OS_PLATFORM,
  'labels.device_model': DEVICE_MODEL,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'labels.net_connection_carrier_isoCountryCode': CARRIER_LOCATION,
};

export const DataViewLabels: Record<ReportViewTypeId, string> = {
  dist: PERF_DIST_LABEL,
  kpi: KIP_OVER_TIME_LABEL,
  cwv: CORE_WEB_VITALS_LABEL,
};

export const USE_BREAK_DOWN_COLUMN = 'USE_BREAK_DOWN_COLUMN';
export const FILTER_RECORDS = 'FILTER_RECORDS';
export const OPERATION_COLUMN = 'operation';
