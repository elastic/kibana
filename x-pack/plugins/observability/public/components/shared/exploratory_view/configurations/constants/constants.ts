/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OperationType } from '../../../../../../../lens/public';
import { ReportViewType } from '../../types';
import {
  CLS_FIELD,
  FCP_FIELD,
  FID_FIELD,
  LCP_FIELD,
  TBT_FIELD,
  TRANSACTION_TIME_TO_FIRST_BYTE,
  TRANSACTION_DURATION,
} from './elasticsearch_fieldnames';
import {
  AGENT_HOST_LABEL,
  BROWSER_FAMILY_LABEL,
  BROWSER_VERSION_LABEL,
  CLS_LABEL,
  CORE_WEB_VITALS_LABEL,
  DCL_LABEL,
  DEVICE_DISTRIBUTION_LABEL,
  DEVICE_LABEL,
  ENVIRONMENT_LABEL,
  FCP_LABEL,
  FID_LABEL,
  HOST_NAME_LABEL,
  KPI_OVER_TIME_LABEL,
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
  PERF_DIST_LABEL,
  PORT_LABEL,
  REQUEST_METHOD,
  SERVICE_NAME_LABEL,
  TAGS_LABEL,
  TBT_LABEL,
  URL_LABEL,
  BACKEND_TIME_LABEL,
  MONITORS_DURATION_LABEL,
  PAGE_LOAD_TIME_LABEL,
  LABELS_FIELD,
  STEP_NAME_LABEL,
  STEP_DURATION_LABEL,
} from './labels';
import {
  MONITOR_DURATION_US,
  SYNTHETICS_CLS,
  SYNTHETICS_DCL,
  SYNTHETICS_DOCUMENT_ONLOAD,
  SYNTHETICS_FCP,
  SYNTHETICS_LCP,
  SYNTHETICS_STEP_DURATION,
  SYNTHETICS_STEP_NAME,
} from './field_names/synthetics';
import { DOCUMENT_FIELD_NAME } from '../../../../../../../lens/common/constants';

export const DEFAULT_TIME = { from: 'now-1h', to: 'now' };

export const RECORDS_FIELD = DOCUMENT_FIELD_NAME;
export const RECORDS_PERCENTAGE_FIELD = 'RecordsPercentage';

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

  [SYNTHETICS_CLS]: CLS_LABEL,
  [SYNTHETICS_DCL]: DCL_LABEL,
  [SYNTHETICS_STEP_DURATION]: STEP_DURATION_LABEL,
  [SYNTHETICS_LCP]: LCP_LABEL,
  [SYNTHETICS_FCP]: FCP_LABEL,
  [SYNTHETICS_DOCUMENT_ONLOAD]: PAGE_LOAD_TIME_LABEL,
  [TRANSACTION_TIME_TO_FIRST_BYTE]: BACKEND_TIME_LABEL,
  [TRANSACTION_DURATION]: PAGE_LOAD_TIME_LABEL,

  'monitor.id': MONITOR_ID_LABEL,
  'monitor.status': MONITOR_STATUS_LABEL,
  [MONITOR_DURATION_US]: MONITORS_DURATION_LABEL,
  [SYNTHETICS_STEP_NAME]: STEP_NAME_LABEL,

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
  'http.request.method': REQUEST_METHOD,
  percentile: 'Percentile',
  LABEL_FIELDS_FILTER: LABELS_FIELD,
  LABEL_FIELDS_BREAKDOWN: 'Labels field',
};

export const DataViewLabels: Record<ReportViewType, string> = {
  'data-distribution': PERF_DIST_LABEL,
  'kpi-over-time': KPI_OVER_TIME_LABEL,
  'core-web-vitals': CORE_WEB_VITALS_LABEL,
  'device-data-distribution': DEVICE_DISTRIBUTION_LABEL,
};

export enum ReportTypes {
  KPI = 'kpi-over-time',
  DISTRIBUTION = 'data-distribution',
  CORE_WEB_VITAL = 'core-web-vitals',
  DEVICE_DISTRIBUTION = 'device-data-distribution',
}

export enum DataTypes {
  SYNTHETICS = 'synthetics',
  UX = 'ux',
  MOBILE = 'mobile',
  METRICS = 'infra_metrics',
}

export const USE_BREAK_DOWN_COLUMN = 'USE_BREAK_DOWN_COLUMN';
export const FILTER_RECORDS = 'FILTER_RECORDS';
export const TERMS_COLUMN = 'TERMS_COLUMN';
export const OPERATION_COLUMN = 'operation';
export const PERCENTILE = 'percentile';

export const REPORT_METRIC_FIELD = 'REPORT_METRIC_FIELD';

export const PERCENTILE_RANKS = [
  '99th' as OperationType,
  '95th' as OperationType,
  '90th' as OperationType,
  '75th' as OperationType,
  '50th' as OperationType,
];
export const LABEL_FIELDS_FILTER = 'LABEL_FIELDS_FILTER';
export const LABEL_FIELDS_BREAKDOWN = 'LABEL_FIELDS_BREAKDOWN';
