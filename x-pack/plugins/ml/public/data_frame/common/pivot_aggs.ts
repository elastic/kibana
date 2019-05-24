/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../common/types/common';
import { KBN_FIELD_TYPES } from '../../../common/constants/field_types';

import { AggName } from './aggregations';
import { FieldName } from './fields';

export enum PIVOT_SUPPORTED_AGGS {
  AVG = 'avg',
  CARDINALITY = 'cardinality',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  VALUE_COUNT = 'value_count',
}

export const pivotSupportedAggs: PIVOT_SUPPORTED_AGGS[] = [
  PIVOT_SUPPORTED_AGGS.AVG,
  PIVOT_SUPPORTED_AGGS.CARDINALITY,
  PIVOT_SUPPORTED_AGGS.MAX,
  PIVOT_SUPPORTED_AGGS.MIN,
  PIVOT_SUPPORTED_AGGS.SUM,
  PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
];

export const pivotAggsFieldSupport = {
  [KBN_FIELD_TYPES.ATTACHMENT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.BOOLEAN]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.DATE]: [
    PIVOT_SUPPORTED_AGGS.MAX,
    PIVOT_SUPPORTED_AGGS.MIN,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
  ],
  [KBN_FIELD_TYPES.GEO_POINT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.GEO_SHAPE]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.IP]: [PIVOT_SUPPORTED_AGGS.CARDINALITY, PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.MURMUR3]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.NUMBER]: [
    PIVOT_SUPPORTED_AGGS.AVG,
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.MAX,
    PIVOT_SUPPORTED_AGGS.MIN,
    PIVOT_SUPPORTED_AGGS.SUM,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
  ],
  [KBN_FIELD_TYPES.STRING]: [PIVOT_SUPPORTED_AGGS.CARDINALITY, PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES._SOURCE]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.UNKNOWN]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
  [KBN_FIELD_TYPES.CONFLICT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT],
};

type PivotAgg = {
  [key in PIVOT_SUPPORTED_AGGS]?: {
    field: FieldName;
  }
};

export type PivotAggDict = { [key in AggName]: PivotAgg };

// The internal representation of an aggregation definition.
export interface PivotAggsConfig {
  agg: PIVOT_SUPPORTED_AGGS;
  field: FieldName;
  aggName: AggName;
  dropDownName: string;
}

export type PivotAggsConfigDict = Dictionary<PivotAggsConfig>;
