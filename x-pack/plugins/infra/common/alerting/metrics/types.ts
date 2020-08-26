/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { ItemTypeRT } from '../../inventory_models/types';

// TODO: Have threshold and inventory alerts import these types from this file instead of from their
// local directories
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';
export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';

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
    criteria: rt.array(rt.any),
    alertInterval: rt.string,
  }),
]);

const metricThresholdAlertPreviewRequestParamsRT = rt.intersection([
  baseAlertRequestParamsRT,
  rt.partial({
    groupBy: rt.union([rt.string, rt.array(rt.string), rt.undefined]),
  }),
  rt.type({
    alertType: rt.literal(METRIC_THRESHOLD_ALERT_TYPE_ID),
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
  }),
]);
export type InventoryAlertPreviewRequestParams = rt.TypeOf<
  typeof inventoryAlertPreviewRequestParamsRT
>;

export const alertPreviewRequestParamsRT = rt.union([
  metricThresholdAlertPreviewRequestParamsRT,
  inventoryAlertPreviewRequestParamsRT,
]);
export type AlertPreviewRequestParams = rt.TypeOf<typeof alertPreviewRequestParamsRT>;

export const alertPreviewSuccessResponsePayloadRT = rt.type({
  numberOfGroups: rt.number,
  resultTotals: rt.type({
    fired: rt.number,
    noData: rt.number,
    error: rt.number,
  }),
});
export type AlertPreviewSuccessResponsePayload = rt.TypeOf<
  typeof alertPreviewSuccessResponsePayloadRT
>;
