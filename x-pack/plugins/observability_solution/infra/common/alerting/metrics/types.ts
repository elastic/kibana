/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TimeUnitChar } from '@kbn/observability-plugin/common/utils/formatters/duration';
import { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { LEGACY_COMPARATORS } from '@kbn/observability-plugin/common/utils/convert_legacy_outside_comparator';
import { SnapshotCustomMetricInput } from '../../http_api';

export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';
export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';

export enum InfraRuleType {
  MetricThreshold = 'metrics.alert.threshold',
  InventoryThreshold = 'metrics.alert.inventory.threshold',
}

export enum Aggregators {
  COUNT = 'count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  RATE = 'rate',
  CARDINALITY = 'cardinality',
  P95 = 'p95',
  P99 = 'p99',
  CUSTOM = 'custom',
}

export enum AlertStates {
  OK,
  ALERT,
  WARNING,
  NO_DATA,
  ERROR,
}

// Types for the executor

export interface InventoryMetricConditions {
  metric: SnapshotMetricType;
  timeSize: number;
  timeUnit: TimeUnitChar;
  sourceId?: string;
  threshold: number[];
  comparator: COMPARATORS | LEGACY_COMPARATORS;
  customMetric?: SnapshotCustomMetricInput;
  warningThreshold?: number[];
  warningComparator?: COMPARATORS | LEGACY_COMPARATORS;
}

export interface InventoryMetricThresholdParams {
  criteria: InventoryMetricConditions[];
  filterQuery?: string;
  filterQueryText?: string;
  nodeType: InventoryItemType;
  sourceId?: string;
  alertOnNoData?: boolean;
}

export interface MetricThresholdParams {
  criteria: MetricExpressionParams[];
  filterQuery?: string;
  filterQueryText?: string;
  sourceId?: string;
  alertOnNoData?: boolean;
  alertOnGroupDisappear?: boolean;
}

interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: TimeUnitChar;
  sourceId?: string;
  threshold: number[];
  comparator: COMPARATORS | LEGACY_COMPARATORS;
  warningComparator?: COMPARATORS | LEGACY_COMPARATORS;
  warningThreshold?: number[];
}

export interface NonCountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Exclude<Aggregators, [Aggregators.COUNT, Aggregators.CUSTOM]>;
  metric: string;
}

export interface CountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Aggregators.COUNT;
}

export type CustomMetricAggTypes = Exclude<
  Aggregators,
  Aggregators.CUSTOM | Aggregators.RATE | Aggregators.P95 | Aggregators.P99
>;

export interface MetricExpressionCustomMetric {
  name: string;
  aggType: CustomMetricAggTypes;
  field?: string;
  filter?: string;
}

export interface CustomMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Aggregators.CUSTOM;
  customMetrics: MetricExpressionCustomMetric[];
  equation?: string;
  label?: string;
}

export type MetricExpressionParams =
  | NonCountMetricExpressionParams
  | CountMetricExpressionParams
  | CustomMetricExpressionParams;

export const QUERY_INVALID: unique symbol = Symbol('QUERY_INVALID');

export type FilterQuery = string | typeof QUERY_INVALID;

export interface AlertExecutionDetails {
  alertId: string;
  executionId: string;
}
