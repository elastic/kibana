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
import { getAggFormConfig } from '../sections/create_transform/components/step_define/common/get_agg_form_config';
import { PivotAggsConfigFilter } from '../sections/create_transform/components/step_define/common/filter_agg/types';

export type PivotSupportedAggs = typeof PIVOT_SUPPORTED_AGGS[keyof typeof PIVOT_SUPPORTED_AGGS];

export function isPivotSupportedAggs(arg: any): arg is PivotSupportedAggs {
  return Object.values(PIVOT_SUPPORTED_AGGS).includes(arg);
}

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
  [key in AggName]: PivotAgg;
};

/**
 * The maximum level of sub-aggregations
 */
export const MAX_NESTING_SUB_AGGS = 10;

// The internal representation of an aggregation definition.
export interface PivotAggsConfigBase {
  agg: PivotSupportedAggs;
  aggName: AggName;
  dropDownName: string;
  /** Indicates if aggregation supports sub-aggregations */
  isSubAggsSupported?: boolean;
  /** Dictionary of the sub-aggregations */
  subAggs?: PivotAggsConfigDict;
  /** Reference to the parent aggregation */
  parentAgg?: PivotAggsConfig;
}

/**
 * Resolves agg UI config from provided ES agg definition
 */
export function getAggConfigFromEsAgg(
  esAggDefinition: Record<string, any>,
  aggName: string,
  parentRef?: PivotAggsConfig
) {
  const aggKeys = Object.keys(esAggDefinition);

  // Find the main aggregation key
  const agg = aggKeys.find((aggKey) => aggKey !== 'aggs');

  if (!isPivotSupportedAggs(agg)) {
    throw new Error(`Aggregation "${agg}" is not supported`);
  }

  const commonConfig: PivotAggsConfigBase = {
    ...esAggDefinition[agg],
    agg,
    aggName,
    dropDownName: aggName,
  };

  const config = getAggFormConfig(agg, commonConfig);

  if (parentRef) {
    config.parentAgg = parentRef;
  }

  if (isPivotAggsWithExtendedForm(config)) {
    config.setUiConfigFromEs(esAggDefinition[agg]);
  }

  if (aggKeys.includes('aggs')) {
    config.subAggs = {};
    for (const [subAggName, subAggConfigs] of Object.entries(
      esAggDefinition.aggs as Record<string, object>
    )) {
      config.subAggs[subAggName] = getAggConfigFromEsAgg(subAggConfigs, subAggName, config);
    }
  }

  return config;
}

export interface PivotAggsConfigWithUiBase extends PivotAggsConfigBase {
  field: EsFieldName;
}

export interface PivotAggsConfigWithExtra<T> extends PivotAggsConfigWithUiBase {
  /** Form component */
  AggFormComponent: FC<{
    aggConfig: Partial<T>;
    onChange: (arg: Partial<T>) => void;
    selectedField: string;
  }>;
  /** Aggregation specific configuration */
  aggConfig: Partial<T>;
  /** Set UI configuration from ES aggregation definition */
  setUiConfigFromEs: (arg: { [key: string]: any }) => void;
  /** Converts UI agg config form to ES agg request object */
  getEsAggConfig: () => { [key: string]: any } | null;
  /** Indicates if the configuration is valid */
  isValid: () => boolean;
  /** Provides aggregation name generated based on the configuration */
  getAggName?: () => string | undefined;
  /** Helper text for the aggregation reflecting some configuration info */
  helperText?: () => string | undefined;
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
    isPivotSupportedAggs(arg.agg)
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
): PivotAgg | null {
  let esAgg: { [key: string]: any } | null = { ...pivotAggsConfig };

  delete esAgg.agg;
  delete esAgg.aggName;
  delete esAgg.dropDownName;
  delete esAgg.parentAgg;

  if (isPivotAggsWithExtendedForm(pivotAggsConfig)) {
    esAgg = pivotAggsConfig.getEsAggConfig();

    if (esAgg === null) {
      return null;
    }
  }

  const result = {
    [pivotAggsConfig.agg]: esAgg,
  };

  if (
    isPivotAggsConfigWithUiSupport(pivotAggsConfig) &&
    pivotAggsConfig.subAggs !== undefined &&
    Object.keys(pivotAggsConfig.subAggs).length > 0
  ) {
    result.aggs = {};
    for (const subAggConfig of Object.values(pivotAggsConfig.subAggs)) {
      result.aggs[subAggConfig.aggName] = getEsAggFromAggConfig(subAggConfig);
    }
  }

  return result;
}
