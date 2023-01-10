/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OperationType } from '@kbn/lens-plugin/public';
import { DOCUMENT_FIELD_NAME } from '@kbn/lens-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { ReportViewType } from '../../types';
import {
  CLS_FIELD,
  FCP_FIELD,
  FID_FIELD,
  LCP_FIELD,
  TBT_FIELD,
  TRANSACTION_DURATION,
  TRANSACTION_TIME_TO_FIRST_BYTE,
} from './elasticsearch_fieldnames';
import {
  AGENT_HOST_LABEL,
  AGENT_TYPE_LABEL,
  BACKEND_TIME_LABEL,
  BROWSER_FAMILY_LABEL,
  BROWSER_VERSION_LABEL,
  CLS_LABEL,
  CORE_WEB_VITALS_LABEL,
  DCL_LABEL,
  DEVICE_DISTRIBUTION_LABEL,
  DEVICE_LABEL,
  ENVIRONMENT_LABEL,
  EVENT_DATASET_LABEL,
  FCP_LABEL,
  FID_LABEL,
  HEATMAP_LABEL,
  HOST_NAME_LABEL,
  KPI_LABEL,
  KPI_OVER_TIME_LABEL,
  LABELS_FIELD,
  LCP_LABEL,
  LOCATION_LABEL,
  MESSAGE_LABEL,
  METRIC_LABEL,
  MONITOR_ID_LABEL,
  MONITOR_NAME_LABEL,
  MONITOR_STATUS_LABEL,
  MONITOR_TYPE_LABEL,
  MONITORS_DURATION_LABEL,
  OBSERVER_LOCATION_LABEL,
  OS_LABEL,
  PAGE_LOAD_TIME_LABEL,
  PERF_DIST_LABEL,
  PORT_LABEL,
  REQUEST_METHOD,
  SERVICE_NAME_LABEL,
  SERVICE_TYPE_LABEL,
  SINGLE_METRIC_LABEL,
  STEP_DURATION_LABEL,
  STEP_NAME_LABEL,
  TAGS_LABEL,
  TBT_LABEL,
  URL_LABEL,
} from './labels';
import {
  MONITOR_DURATION_US,
  SYNTHETICS_BLOCKED_TIMINGS,
  SYNTHETICS_CLS,
  SYNTHETICS_CONNECT_TIMINGS,
  SYNTHETICS_DCL,
  SYNTHETICS_DNS_TIMINGS,
  SYNTHETICS_DOCUMENT_ONLOAD,
  SYNTHETICS_FCP,
  SYNTHETICS_LCP,
  SYNTHETICS_RECEIVE_TIMINGS,
  SYNTHETICS_SEND_TIMINGS,
  SYNTHETICS_SSL_TIMINGS,
  SYNTHETICS_STEP_DURATION,
  SYNTHETICS_STEP_NAME,
  SYNTHETICS_TOTAL_TIMINGS,
  SYNTHETICS_WAIT_TIMINGS,
} from './field_names/synthetics';

export const DEFAULT_TIME = { from: 'now-1h', to: 'now' };

export const RECORDS_FIELD = DOCUMENT_FIELD_NAME;
export const RECORDS_PERCENTAGE_FIELD = 'RecordsPercentage';
export const FORMULA_COLUMN = 'FORMULA_COLUMN';

export const FieldLabels: Record<string, string> = {
  'user_agent.name': BROWSER_FAMILY_LABEL,
  'user_agent.version': BROWSER_VERSION_LABEL,
  'user_agent.os.name': OS_LABEL,
  'client.geo.country_name': LOCATION_LABEL,
  'user_agent.device.name': DEVICE_LABEL,
  'observer.geo.name': OBSERVER_LOCATION_LABEL,
  'service.name': SERVICE_NAME_LABEL,
  'service.environment': ENVIRONMENT_LABEL,
  'service.type': SERVICE_TYPE_LABEL,
  'event.dataset': EVENT_DATASET_LABEL,
  message: MESSAGE_LABEL,

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
  [SYNTHETICS_CONNECT_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.connect', {
    defaultMessage: 'Connect',
  }),
  [SYNTHETICS_DNS_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.dns', {
    defaultMessage: 'DNS',
  }),
  [SYNTHETICS_WAIT_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.wait', {
    defaultMessage: 'Wait',
  }),
  [SYNTHETICS_SSL_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.ssl', {
    defaultMessage: 'SSL',
  }),
  [SYNTHETICS_BLOCKED_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.blocked', {
    defaultMessage: 'Blocked',
  }),
  [SYNTHETICS_SEND_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.send', {
    defaultMessage: 'Send',
  }),
  [SYNTHETICS_RECEIVE_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.receive', {
    defaultMessage: 'Receive',
  }),
  [SYNTHETICS_TOTAL_TIMINGS]: i18n.translate('xpack.observability.expView.synthetics.total', {
    defaultMessage: 'Total',
  }),

  'kibana.alert.rule.category': i18n.translate('xpack.observability.expView.alerts.category', {
    defaultMessage: 'Rule category',
  }),
  'kibana.alert.rule.name': i18n.translate('xpack.observability.expView.alerts.name', {
    defaultMessage: 'Alert name',
  }),
  'kibana.alert.status': i18n.translate('xpack.observability.expView.alerts.status', {
    defaultMessage: 'Alert status',
  }),

  'monitor.id': MONITOR_ID_LABEL,
  'monitor.status': MONITOR_STATUS_LABEL,
  [MONITOR_DURATION_US]: MONITORS_DURATION_LABEL,
  [SYNTHETICS_STEP_NAME]: STEP_NAME_LABEL,

  'agent.hostname': AGENT_HOST_LABEL,
  'agent.type': AGENT_TYPE_LABEL,
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
  'single-metric': SINGLE_METRIC_LABEL,
  heatmap: HEATMAP_LABEL,
};

export enum ReportTypes {
  KPI = 'kpi-over-time',
  DISTRIBUTION = 'data-distribution',
  CORE_WEB_VITAL = 'core-web-vitals',
  DEVICE_DISTRIBUTION = 'device-data-distribution',
  SINGLE_METRIC = 'single-metric',
  HEATMAP = 'heatmap',
}

export const USE_BREAK_DOWN_COLUMN = 'USE_BREAK_DOWN_COLUMN';
export const FILTER_RECORDS = 'FILTER_RECORDS';
export const TERMS_COLUMN = 'TERMS_COLUMN';
export const OPERATION_COLUMN = 'operation';
export const PERCENTILE = 'percentile';

export const REPORT_METRIC_FIELD = 'REPORT_METRIC_FIELD';
export const REPORT_METRIC_TIMESTAMP = 'REPORT_METRIC_FIELD_TIMESTAMP';

export const PERCENTILE_RANKS = [
  '99th' as OperationType,
  '95th' as OperationType,
  '90th' as OperationType,
  '75th' as OperationType,
  '50th' as OperationType,
  '25th' as OperationType,
];
export const LABEL_FIELDS_FILTER = 'LABEL_FIELDS_FILTER';
export const LABEL_FIELDS_BREAKDOWN = 'LABEL_FIELDS_BREAKDOWN';

export const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';
