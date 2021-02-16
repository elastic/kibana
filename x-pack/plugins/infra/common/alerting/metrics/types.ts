/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { ANOMALY_THRESHOLD } from '../../infra_ml';
import { ItemTypeRT } from '../../inventory_models/types';

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
  threshold: Exclude<ANOMALY_THRESHOLD, ANOMALY_THRESHOLD.LOW>;
  influencerFilter: rt.TypeOf<typeof metricAnomalyInfluencerFilterRT> | undefined;
}

// Alert Preview API
const baseAlertRequestParamsRT = rt.intersection([
  rt.partial({
    filterQuery: rt.union([rt.string, rt.undefined]),
    sourceId: rt.string,
  }),
  rt.type({
    lookback: rt.union([
      rt.literal('ms'),
      rt.literal('s'),
      rt.literal('m'),
      rt.literal('h'),
      rt.literal('d'),
      rt.literal('w'),
      rt.literal('M'),
      rt.literal('y'),
    ]),
    alertInterval: rt.string,
    alertThrottle: rt.string,
    alertOnNoData: rt.boolean,
  }),
]);

const metricThresholdAlertPreviewRequestParamsRT = rt.intersection([
  baseAlertRequestParamsRT,
  rt.partial({
    groupBy: rt.union([rt.string, rt.array(rt.string), rt.undefined]),
  }),
  rt.type({
    alertType: rt.literal(METRIC_THRESHOLD_ALERT_TYPE_ID),
    criteria: rt.array(rt.any),
  }),
]);
export type MetricThresholdAlertPreviewRequestParams = rt.TypeOf<
  typeof metricThresholdAlertPreviewRequestParamsRT
>;

const inventoryAlertPreviewRequestParamsRT = rt.intersection([
  baseAlertRequestParamsRT,
  rt.type({
    nodeType: ItemTypeRT,
    alertType: rt.literal(METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID),
    criteria: rt.array(rt.any),
  }),
]);
export type InventoryAlertPreviewRequestParams = rt.TypeOf<
  typeof inventoryAlertPreviewRequestParamsRT
>;

const metricAnomalyAlertPreviewRequestParamsRT = rt.intersection([
  baseAlertRequestParamsRT,
  rt.type({
    nodeType: metricAnomalyNodeTypeRT,
    metric: metricAnomalyMetricRT,
    threshold: rt.number,
    alertType: rt.literal(METRIC_ANOMALY_ALERT_TYPE_ID),
  }),
  rt.partial({
    influencerFilter: metricAnomalyInfluencerFilterRT,
  }),
]);
export type MetricAnomalyAlertPreviewRequestParams = rt.TypeOf<
  typeof metricAnomalyAlertPreviewRequestParamsRT
>;

export const alertPreviewRequestParamsRT = rt.union([
  metricThresholdAlertPreviewRequestParamsRT,
  inventoryAlertPreviewRequestParamsRT,
  metricAnomalyAlertPreviewRequestParamsRT,
]);
export type AlertPreviewRequestParams = rt.TypeOf<typeof alertPreviewRequestParamsRT>;

export const alertPreviewSuccessResponsePayloadRT = rt.type({
  numberOfGroups: rt.number,
  resultTotals: rt.intersection([
    rt.type({
      fired: rt.number,
      noData: rt.number,
      error: rt.number,
      notifications: rt.number,
    }),
    rt.partial({
      warning: rt.number,
    }),
  ]),
});
export type AlertPreviewSuccessResponsePayload = rt.TypeOf<
  typeof alertPreviewSuccessResponsePayloadRT
>;
