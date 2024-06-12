/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { DataViewSpec, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { Filter, Query } from '@kbn/es-query';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { LEGACY_COMPARATORS } from '../utils/convert_legacy_outside_comparator';
import { TimeUnitChar } from '../utils/formatters/duration';

export const ThresholdFormatterTypeRT = rt.keyof({
  abbreviatedNumber: null,
  bits: null,
  bytes: null,
  number: null,
  percent: null,
  highPrecision: null,
});
export type ThresholdFormatterType = rt.TypeOf<typeof ThresholdFormatterTypeRT>;

export enum Aggregators {
  COUNT = 'count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  CARDINALITY = 'cardinality',
  RATE = 'rate',
  P95 = 'p95',
  P99 = 'p99',
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
export interface CustomThresholdSearchSourceFields extends SerializedSearchSourceFields {
  query?: Query;
  filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}

export interface ThresholdParams {
  criteria: MetricExpressionParams[];
  filterQuery?: string;
  sourceId?: string;
  alertOnNoData?: boolean;
  alertOnGroupDisappear?: boolean;
  searchConfiguration: CustomThresholdSearchSourceFields;
  groupBy?: string[];
}

export interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: TimeUnitChar;
  sourceId?: string;
  threshold: number[];
  comparator: COMPARATORS | LEGACY_COMPARATORS;
}

export interface CustomThresholdExpressionMetric {
  name: string;
  aggType: AggType;
  field?: string;
  filter?: string;
}

export interface CustomMetricExpressionParams extends BaseMetricExpressionParams {
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

export interface Group {
  field: string;
  value: string;
}

export interface TimeRange {
  from?: string;
  to?: string;
}

export interface SearchConfigurationType {
  index: SerializedSearchSourceFields;
  query: {
    query: string;
    language: string;
  };
  filter?: Filter[];
}

export interface SearchConfigurationWithExtractedReferenceType {
  // Index will be a data view spec after extracting references
  index: DataViewSpec;
  query: {
    query: string;
    language: string;
  };
  filter?: Filter[];
}

// Custom threshold alert types

// Alert fields['kibana.alert.group] type
export type GroupBy = Group[];

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
