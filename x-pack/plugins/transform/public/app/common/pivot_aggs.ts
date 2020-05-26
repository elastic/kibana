/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';
import { Dictionary } from '../../../common/types/common';
import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/common';

import { AggName } from './aggregations';
import { EsFieldName } from './fields';
import { PivotAggsConfigFilter } from '../sections/create_transform/components/step_define/common/filter_agg_config';

export type PivotSupportedAggs = typeof PIVOT_SUPPORTED_AGGS[keyof typeof PIVOT_SUPPORTED_AGGS];

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

export const PERCENTILES_AGG_DEFAULT_PERCENTS = [1, 5, 25, 50, 75, 95, 99];

export const pivotAggsFieldSupport = {
  [KBN_FIELD_TYPES.ATTACHMENT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.BOOLEAN]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.DATE]: [
    PIVOT_SUPPORTED_AGGS.MAX,
    PIVOT_SUPPORTED_AGGS.MIN,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
    PIVOT_SUPPORTED_AGGS.FILTER,
  ],
  [KBN_FIELD_TYPES.GEO_POINT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.GEO_SHAPE]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.IP]: [
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
    PIVOT_SUPPORTED_AGGS.FILTER,
  ],
  [KBN_FIELD_TYPES.MURMUR3]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.NUMBER]: [
    PIVOT_SUPPORTED_AGGS.AVG,
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.MAX,
    PIVOT_SUPPORTED_AGGS.MIN,
    PIVOT_SUPPORTED_AGGS.PERCENTILES,
    PIVOT_SUPPORTED_AGGS.SUM,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
    PIVOT_SUPPORTED_AGGS.FILTER,
  ],
  [KBN_FIELD_TYPES.STRING]: [
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
    PIVOT_SUPPORTED_AGGS.FILTER,
  ],
  [KBN_FIELD_TYPES._SOURCE]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.UNKNOWN]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.CONFLICT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
};

export type PivotAgg = {
  [key in PivotSupportedAggs]?: {
    field: EsFieldName;
  };
};

export type PivotAggDict = {
  [key in PivotSupportedAggs]: PivotAgg;
};

// The internal representation of an aggregation definition.
export interface PivotAggsConfigBase {
  agg: PivotSupportedAggs;
  aggName: AggName;
  dropDownName: string;
}

export interface AggFormConfig<T> {
  AggFormComponent: FC<{
    aggConfig: Partial<T>;
    onChange: (arg: T) => void;
  }>;
  defaultAggConfig?: Partial<T>;
}

export interface PivotAggsConfigWithUiBase<T = {}> extends PivotAggsConfigBase {
  field: EsFieldName;
  /**
   * Configuration of agg form
   */
  formConfig: T extends {} ? AggFormConfig<T> : undefined;
  /**
   * Indicates if the user's input is required after quick adding of the aggregation
   * from the suggestions.
   */
  forceEdit?: boolean;
}

interface PivotAggsConfigPercentiles extends PivotAggsConfigWithUiBase {
  agg: typeof PIVOT_SUPPORTED_AGGS.PERCENTILES;
  percents: number[];
}

export type PivotAggsConfigWithUiSupport = PivotAggsConfigWithUiBase | PivotAggsConfigPercentiles;

export function isPivotAggsConfigWithUiSupport(arg: any): arg is PivotAggsConfigWithUiSupport {
  return (
    arg.hasOwnProperty('agg') &&
    arg.hasOwnProperty('aggName') &&
    arg.hasOwnProperty('dropDownName') &&
    arg.hasOwnProperty('field') &&
    Object.values(PIVOT_SUPPORTED_AGGS).includes(arg.agg)
  );
}

/**
 * Union type for agg configs with extended forms
 */
type PivotAggsConfigWithExtendedForm = PivotAggsConfigFilter;

export function isPivotAggsWithExtendedForm(arg: any): arg is PivotAggsConfigWithExtendedForm {
  return arg.hasOwnProperty('formConfig');
}

export function isPivotAggsConfigPercentiles(arg: any): arg is PivotAggsConfigPercentiles {
  return (
    arg.hasOwnProperty('agg') &&
    arg.hasOwnProperty('field') &&
    arg.hasOwnProperty('percents') &&
    arg.agg === PIVOT_SUPPORTED_AGGS.PERCENTILES
  );
}

export type PivotAggsConfig = PivotAggsConfigBase | PivotAggsConfigWithUiSupport;

export type PivotAggsConfigWithUiSupportDict = Dictionary<PivotAggsConfigWithUiSupport>;
export type PivotAggsConfigDict = Dictionary<PivotAggsConfig>;

export function getEsAggFromAggConfig(groupByConfig: PivotAggsConfigBase): PivotAgg {
  const esAgg = { ...groupByConfig };

  delete esAgg.agg;
  delete esAgg.aggName;
  delete esAgg.dropDownName;

  return {
    [groupByConfig.agg]: esAgg,
  };
}
