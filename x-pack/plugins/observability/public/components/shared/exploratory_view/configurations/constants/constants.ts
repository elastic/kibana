/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OperationType } from '@kbn/lens-plugin/public';
import { DOCUMENT_FIELD_NAME } from '@kbn/lens-plugin/common/constants';

export const DEFAULT_TIME = { from: 'now-1h', to: 'now' };

export const RECORDS_FIELD = DOCUMENT_FIELD_NAME;
export const RECORDS_PERCENTAGE_FIELD = 'RecordsPercentage';
export const FORMULA_COLUMN = 'FORMULA_COLUMN';

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
