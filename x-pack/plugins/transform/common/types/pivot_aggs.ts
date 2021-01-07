/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggName } from './aggregations';
import { EsFieldName } from './fields';

export const PIVOT_SUPPORTED_AGGS = {
  AVG: 'avg',
  CARDINALITY: 'cardinality',
  MAX: 'max',
  MIN: 'min',
  PERCENTILES: 'percentiles',
  SUM: 'sum',
  VALUE_COUNT: 'value_count',
  FILTER: 'filter',
} as const;

export type PivotSupportedAggs = typeof PIVOT_SUPPORTED_AGGS[keyof typeof PIVOT_SUPPORTED_AGGS];

export type PivotAgg = {
  [key in PivotSupportedAggs]?: {
    field: EsFieldName;
  };
};

export type PivotAggDict = {
  [key in AggName]: PivotAgg;
};
