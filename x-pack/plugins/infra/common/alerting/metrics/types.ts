/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { Unit } from '@elastic/datemath';
import { ANOMALY_THRESHOLD } from '../../infra_ml';
import { InventoryItemType, SnapshotMetricType } from '../../inventory_models/types';
import { SnapshotCustomMetricInput } from '../../http_api';

// TODO: Have threshold and inventory alerts import these types from this file instead of from their
// local directories
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';
export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';
export const METRIC_ANOMALY_ALERT_TYPE_ID = 'metrics.alert.anomaly';

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
  BETWEEN = 'between',
  OUTSIDE_RANGE = 'outside',
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
}

const metricAnomalyNodeTypeRT = rt.union([rt.literal('hosts'), rt.literal('k8s')]);
const metricAnomalyMetricRT = rt.union([
  rt.literal('memory_usage'),
  rt.literal('network_in'),
  rt.literal('network_out'),
]);
const metricAnomalyInfluencerFilterRT = rt.type({
  fieldName: rt.string,
  fieldValue: rt.string,
});

export interface MetricAnomalyParams {
  nodeType: rt.TypeOf<typeof metricAnomalyNodeTypeRT>;
  metric: rt.TypeOf<typeof metricAnomalyMetricRT>;
  alertInterval?: string;
  sourceId?: string;
  spaceId?: string;
  threshold: Exclude<ANOMALY_THRESHOLD, ANOMALY_THRESHOLD.LOW>;
  influencerFilter: rt.TypeOf<typeof metricAnomalyInfluencerFilterRT> | undefined;
}

// Types for the executor

export interface InventoryMetricConditions {
  metric: SnapshotMetricType;
  timeSize: number;
  timeUnit: Unit;
  sourceId?: string;
  threshold: number[];
  comparator: Comparator;
  customMetric?: SnapshotCustomMetricInput;
  warningThreshold?: number[];
  warningComparator?: Comparator;
}

export interface InventoryMetricThresholdParams {
  criteria: InventoryMetricConditions[];
  filterQuery?: string;
  filterQueryText?: string;
  nodeType: InventoryItemType;
  sourceId?: string;
  alertOnNoData?: boolean;
}

export const QUERY_INVALID: unique symbol = Symbol('QUERY_INVALID');

export type FilterQuery = string | typeof QUERY_INVALID;
