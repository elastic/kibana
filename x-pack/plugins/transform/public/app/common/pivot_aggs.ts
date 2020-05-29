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
import { getAggFormConfig } from '../sections/create_transform/components/step_define/common/get_agg_form_config';

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

/**
 * Resolves agg UI config from provided ES agg definition
 */
export function getAggConfigFromEsAgg(esAggDefinition: Record<string, any>) {
  const aggKeys = Object.keys(esAggDefinition);

  // Find the main aggregation key
  const agg = aggKeys.find((aggKey) => aggKey !== 'aggs');

  if (!agg) {
    throw new Error('Invalid aggregation definition');
  }

  const config = getAggFormConfig(agg);

  if (aggKeys.includes('agg')) {
    // process sub-aggregation
  }

  if (!config) {
    return;
  }

  return config.mappers.esToUiAggConfig(esAggDefinition);
}

export interface PivotAggsConfigWithUiBase extends PivotAggsConfigBase {
  field: EsFieldName;
}

export interface PivotAggsConfigWithUiCustom extends PivotAggsConfigBase {
  aggConfig: any;
}

export interface PivotAggsConfigWithExtra<T> extends PivotAggsConfigWithUiBase {
  /** Form component */
  AggFormComponent: FC<{
    aggConfig: Partial<T>;
    onChange: (arg: Partial<T>) => void;
    selectedField: string;
  }>;
  /** Aggregation specific configuration */
  aggConfig: T;
  /**
   * Indicates if the user's input is required after quick adding of the aggregation
   * from the suggestions.
   */
  forceEdit?: boolean;
  /** Set UI configuration from ES aggregation definition */
  esToUiAggConfig: (arg: { [key: string]: any }) => void;
  /** Converts UI agg config form to ES agg request object */
  uiAggConfigToEs: () => { [key: string]: any };
}

interface PivotAggsConfigPercentiles extends PivotAggsConfigWithUiBase {
  agg: typeof PIVOT_SUPPORTED_AGGS.PERCENTILES;
  percents: number[];
}

export type PivotAggsConfigWithUiSupport =
  | PivotAggsConfigWithUiBase
  | PivotAggsConfigPercentiles
  | PivotAggsConfigWithExtendedForm;

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
  return arg.hasOwnProperty('AggFormComponent');
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

/**
 * Extracts Elasticsearch-ready aggregation configuration
 * from the UI config
 */
export function getEsAggFromAggConfig(
  pivotAggsConfig: PivotAggsConfigBase | PivotAggsConfigWithExtendedForm
): PivotAgg {
  console.log(pivotAggsConfig, '___pivotAggsConfig___');

  let esAgg: { [key: string]: any } = { ...pivotAggsConfig };

  delete esAgg.agg;
  delete esAgg.aggName;
  delete esAgg.dropDownName;

  if (isPivotAggsWithExtendedForm(pivotAggsConfig)) {
    esAgg = pivotAggsConfig.uiAggConfigToEs();
  }

  return {
    [pivotAggsConfig.agg]: esAgg,
  };
}
