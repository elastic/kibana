/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { values } from 'lodash';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { Color } from './color_palette';
import { metricsExplorerMetricRT } from './metrics_explorer';
import { TimeUnitChar } from '../utils/formatters/duration';
import { SNAPSHOT_CUSTOM_AGGREGATIONS } from './constants';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeepPartialArray<T> extends Array<DeepPartial<T>> {}

type DeepPartialObject<T> = { [P in keyof T]+?: DeepPartial<T[P]> };
export type DeepPartial<T> = T extends any[]
  ? DeepPartialArray<T[number]>
  : T extends object
  ? DeepPartialObject<T>
  : T;

export const ThresholdFormatterTypeRT = rt.keyof({
  abbreviatedNumber: null,
  bits: null,
  bytes: null,
  number: null,
  percent: null,
  highPrecision: null,
});
export type ThresholdFormatterType = rt.TypeOf<typeof ThresholdFormatterTypeRT>;

const pointRT = rt.type({
  timestamp: rt.number,
  value: rt.number,
});

export type Point = rt.TypeOf<typeof pointRT>;

const serieRT = rt.type({
  id: rt.string,
  points: rt.array(pointRT),
});

const seriesRT = rt.array(serieRT);

export type Series = rt.TypeOf<typeof seriesRT>;

export const getLogAlertsChartPreviewDataSuccessResponsePayloadRT = rt.type({
  data: rt.type({
    series: seriesRT,
  }),
});

export type GetLogAlertsChartPreviewDataSuccessResponsePayload = rt.TypeOf<
  typeof getLogAlertsChartPreviewDataSuccessResponsePayloadRT
>;

/**
 * Properties specific to the Metrics Source Configuration.
 */
export const SourceConfigurationTimestampColumnRuntimeType = rt.type({
  timestampColumn: rt.type({
    id: rt.string,
  }),
});
export const SourceConfigurationMessageColumnRuntimeType = rt.type({
  messageColumn: rt.type({
    id: rt.string,
  }),
});

export const SourceConfigurationFieldColumnRuntimeType = rt.type({
  fieldColumn: rt.type({
    id: rt.string,
    field: rt.string,
  }),
});

export const SourceConfigurationColumnRuntimeType = rt.union([
  SourceConfigurationTimestampColumnRuntimeType,
  SourceConfigurationMessageColumnRuntimeType,
  SourceConfigurationFieldColumnRuntimeType,
]);

// Kibana data views
export const logDataViewReferenceRT = rt.type({
  type: rt.literal('data_view'),
  dataViewId: rt.string,
});

// Index name
export const logIndexNameReferenceRT = rt.type({
  type: rt.literal('index_name'),
  indexName: rt.string,
});

export const logIndexReferenceRT = rt.union([logDataViewReferenceRT, logIndexNameReferenceRT]);

/**
 * Source status
 */
const SourceStatusFieldRuntimeType = rt.type({
  name: rt.string,
  type: rt.string,
  searchable: rt.boolean,
  aggregatable: rt.boolean,
  displayable: rt.boolean,
});
export const SourceStatusRuntimeType = rt.type({
  logIndicesExist: rt.boolean,
  metricIndicesExist: rt.boolean,
  remoteClustersExist: rt.boolean,
  indexFields: rt.array(SourceStatusFieldRuntimeType),
});
export const metricsSourceStatusRT = rt.strict({
  metricIndicesExist: SourceStatusRuntimeType.props.metricIndicesExist,
  remoteClustersExist: SourceStatusRuntimeType.props.metricIndicesExist,
  indexFields: SourceStatusRuntimeType.props.indexFields,
});

export type MetricsSourceStatus = rt.TypeOf<typeof metricsSourceStatusRT>;

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
  CUSTOM = 'custom',
}

const metricsExplorerOptionsMetricRT = rt.intersection([
  metricsExplorerMetricRT,
  rt.partial({
    rate: rt.boolean,
    color: rt.keyof(Object.fromEntries(values(Color).map((c) => [c, null])) as Record<Color, null>),
    label: rt.string,
  }),
]);

export type MetricsExplorerOptionsMetric = rt.TypeOf<typeof metricsExplorerOptionsMetricRT>;

export enum MetricsExplorerChartType {
  line = 'line',
  area = 'area',
  bar = 'bar',
}

export enum InfraRuleType {
  MetricThreshold = 'metrics.alert.threshold',
  InventoryThreshold = 'metrics.alert.inventory.threshold',
  Anomaly = 'metrics.alert.anomaly',
}

export enum AlertStates {
  OK,
  ALERT,
  WARNING,
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
  sourceId?: string;
  spaceId?: string;
  threshold: Exclude<ML_ANOMALY_THRESHOLD, ML_ANOMALY_THRESHOLD.LOW>;
  influencerFilter: rt.TypeOf<typeof metricAnomalyInfluencerFilterRT> | undefined;
}

// Types for the executor

export interface ThresholdParams {
  criteria: MetricExpressionParams[];
  filterQuery?: string;
  sourceId?: string;
  alertOnNoData?: boolean;
  alertOnGroupDisappear?: boolean;
  searchConfiguration: SerializedSearchSourceFields;
  groupBy?: string[];
}

interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: TimeUnitChar;
  sourceId?: string;
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

export enum InfraFormatterType {
  number = 'number',
  abbreviatedNumber = 'abbreviatedNumber',
  bytes = 'bytes',
  bits = 'bits',
  percent = 'percent',
}

export type SnapshotCustomAggregation = typeof SNAPSHOT_CUSTOM_AGGREGATIONS[number];
const snapshotCustomAggregationKeys = SNAPSHOT_CUSTOM_AGGREGATIONS.reduce<
  Record<SnapshotCustomAggregation, null>
>((acc, agg) => ({ ...acc, [agg]: null }), {} as Record<SnapshotCustomAggregation, null>);

export const SnapshotCustomAggregationRT = rt.keyof(snapshotCustomAggregationKeys);

export const SnapshotCustomMetricInputRT = rt.intersection([
  rt.type({
    type: rt.literal('custom'),
    field: rt.string,
    aggregation: SnapshotCustomAggregationRT,
    id: rt.string,
  }),
  rt.partial({
    label: rt.string,
  }),
]);
export type SnapshotCustomMetricInput = rt.TypeOf<typeof SnapshotCustomMetricInputRT>;
