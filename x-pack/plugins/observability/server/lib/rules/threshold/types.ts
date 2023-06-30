/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { Aggregators, Comparator } from '../../../../common/threshold_rule/types';
import { TimeUnitChar } from '../../../../common';

export enum InfraRuleType {
  MetricThreshold = 'metrics.alert.threshold',
  InventoryThreshold = 'metrics.alert.inventory.threshold',
  Anomaly = 'metrics.alert.anomaly',
}

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
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
  spaceId?: string;
  threshold: Exclude<ML_ANOMALY_THRESHOLD, ML_ANOMALY_THRESHOLD.LOW>;
  influencerFilter: rt.TypeOf<typeof metricAnomalyInfluencerFilterRT> | undefined;
}

// Types for the executor

interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: TimeUnitChar;
  threshold: number[];
  comparator: Comparator;
  warningComparator?: Comparator;
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

export interface AlertExecutionDetails {
  alertId: string;
  executionId: string;
}
