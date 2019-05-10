/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';

import { AggName } from './aggregations';
import { FieldName, FIELD_TYPE } from './fields';

export enum PIVOT_SUPPORTED_AGGS {
  AVG = 'avg',
  CARDINALITY = 'cardinality',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  VALUE_COUNT = 'value_count',
}

type PivotAggSupportedAggs =
  | PIVOT_SUPPORTED_AGGS.AVG
  | PIVOT_SUPPORTED_AGGS.CARDINALITY
  | PIVOT_SUPPORTED_AGGS.MAX
  | PIVOT_SUPPORTED_AGGS.MIN
  | PIVOT_SUPPORTED_AGGS.SUM
  | PIVOT_SUPPORTED_AGGS.VALUE_COUNT;

export const pivotSupportedAggs: PivotAggSupportedAggs[] = [
  PIVOT_SUPPORTED_AGGS.AVG,
  PIVOT_SUPPORTED_AGGS.CARDINALITY,
  PIVOT_SUPPORTED_AGGS.MAX,
  PIVOT_SUPPORTED_AGGS.MIN,
  PIVOT_SUPPORTED_AGGS.SUM,
  PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
];

export const pivotAggsFieldSupport = {
  [FIELD_TYPE.ATTACHMENT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.BOOLEAN]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.DATE]: [
    PIVOT_SUPPORTED_AGGS.AVG,
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.MAX,
    PIVOT_SUPPORTED_AGGS.MIN,
    PIVOT_SUPPORTED_AGGS.SUM,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
  ],
  [FIELD_TYPE.GEO_POINT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.GEO_SHAPE]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.IP]: [PIVOT_SUPPORTED_AGGS.CARDINALITY, PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.MURMUR3]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.NUMBER]: [
    PIVOT_SUPPORTED_AGGS.AVG,
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.MAX,
    PIVOT_SUPPORTED_AGGS.MIN,
    PIVOT_SUPPORTED_AGGS.SUM,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
  ],
  [FIELD_TYPE.STRING]: [PIVOT_SUPPORTED_AGGS.CARDINALITY, PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE._SOURCE]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.UNKNOWN]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [FIELD_TYPE.CONFLICT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
};

type PivotAgg = {
  [key in PivotAggSupportedAggs]?: {
    field: FieldName;
  }
};

export type PivotAggDict = { [key in AggName]: PivotAgg };

// The internal representation of an aggregation definition.
export interface PivotAggsConfig {
  agg: PivotAggSupportedAggs;
  field: FieldName;
  aggName: AggName;
}

export type PivotAggsConfigDict = Dictionary<PivotAggsConfig>;
