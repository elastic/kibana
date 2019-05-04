/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';

import { AggName, FieldName } from './aggregations';

export enum PIVOT_SUPPORTED_AGGS {
  AVG = 'avg',
  CARDINALITY = 'cardinality',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  TRANSACTION_DURATION = 'transaction_duration',
  VALUE_COUNT = 'value_count',
}

type PivotAggSupportedAggs =
  | PIVOT_SUPPORTED_AGGS.AVG
  | PIVOT_SUPPORTED_AGGS.CARDINALITY
  | PIVOT_SUPPORTED_AGGS.MAX
  | PIVOT_SUPPORTED_AGGS.MIN
  | PIVOT_SUPPORTED_AGGS.SUM
  | PIVOT_SUPPORTED_AGGS.TRANSACTION_DURATION
  | PIVOT_SUPPORTED_AGGS.VALUE_COUNT;

export const pivotSupportedAggs = [
  PIVOT_SUPPORTED_AGGS.AVG,
  PIVOT_SUPPORTED_AGGS.CARDINALITY,
  PIVOT_SUPPORTED_AGGS.MAX,
  PIVOT_SUPPORTED_AGGS.MIN,
  PIVOT_SUPPORTED_AGGS.SUM,
  PIVOT_SUPPORTED_AGGS.TRANSACTION_DURATION,
  PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
] as PivotAggSupportedAggs[];

type PivotMetricAgg = {
  [key in PivotAggSupportedAggs]?: {
    field: FieldName;
  }
};
interface PivotScriptedMetricAgg {
  scripted_metric: {
    init_script?: string;
    map_script: string;
    combine_script: string;
    reduce_script: string;
  };
}
type PivotAgg = PivotMetricAgg | PivotScriptedMetricAgg;

export type PivotAggDict = { [key in AggName]: PivotAgg };

// The internal representation of an aggregation definition.
export interface PivotAggsConfig {
  agg: PivotAggSupportedAggs;
  field: FieldName;
  aggName: AggName;
}

export type PivotAggsConfigDict = Dictionary<PivotAggsConfig>;
