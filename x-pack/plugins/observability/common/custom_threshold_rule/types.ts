/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { TimeUnitChar } from '../utils/formatters/duration';
import { CUSTOM_AGGREGATOR } from './constants';

type DeepPartialArray<T> = Array<DeepPartial<T>>;

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
  CARDINALITY = 'cardinality',
}
export const aggType = fromEnum('Aggregators', Aggregators);
export type AggType = rt.TypeOf<typeof aggType>;

export enum MetricsExplorerChartType {
  line = 'line',
  area = 'area',
  bar = 'bar',
}

export enum AlertStates {
  OK,
  ALERT,
  WARNING,
  NO_DATA,
  ERROR,
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

export interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: TimeUnitChar;
  sourceId?: string;
  threshold: number[];
  comparator: Comparator;
  warningComparator?: Comparator;
  warningThreshold?: number[];
}

export interface CustomThresholdExpressionMetric {
  name: string;
  aggType: AggType;
  field?: string;
  filter?: string;
}

export interface CustomMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: typeof CUSTOM_AGGREGATOR;
  metrics: CustomThresholdExpressionMetric[];
  equation?: string;
  label?: string;
}

export type MetricExpressionParams = CustomMetricExpressionParams;

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

/*
 * Utils
 *
 * This utility function can be used to turn a TypeScript enum into a io-ts codec.
 */
export function fromEnum<EnumType extends string>(
  enumName: string,
  theEnum: Record<string, EnumType>
): rt.Type<EnumType, EnumType, unknown> {
  const isEnumValue = (input: unknown): input is EnumType =>
    Object.values<unknown>(theEnum).includes(input);

  return new rt.Type<EnumType>(
    enumName,
    isEnumValue,
    (input, context) => (isEnumValue(input) ? rt.success(input) : rt.failure(input, context)),
    rt.identity
  );
}
