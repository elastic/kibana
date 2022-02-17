/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FC } from 'react';

import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/common';

import type { AggName } from '../../../common/types/aggregations';
import type { Dictionary } from '../../../common/types/common';
import type { EsFieldName } from '../../../common/types/fields';
import type { PivotAgg, PivotSupportedAggs } from '../../../common/types/pivot_aggs';
import { PIVOT_SUPPORTED_AGGS } from '../../../common/types/pivot_aggs';
import { isPopulatedObject } from '../../../common/shared_imports';

import { getAggFormConfig } from '../sections/create_transform/components/step_define/common/get_agg_form_config';
import { PivotAggsConfigFilter } from '../sections/create_transform/components/step_define/common/filter_agg/types';
import { PivotAggsConfigTopMetrics } from '../sections/create_transform/components/step_define/common/top_metrics_agg/types';

export function isPivotSupportedAggs(arg: unknown): arg is PivotSupportedAggs {
  return (
    typeof arg === 'string' &&
    Object.values(PIVOT_SUPPORTED_AGGS).includes(arg as PivotSupportedAggs)
  );
}

export const PERCENTILES_AGG_DEFAULT_PERCENTS = [1, 5, 25, 50, 75, 95, 99];
export const TERMS_AGG_DEFAULT_SIZE = 10;

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
    PIVOT_SUPPORTED_AGGS.TOP_METRICS,
    PIVOT_SUPPORTED_AGGS.TERMS,
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
    PIVOT_SUPPORTED_AGGS.TOP_METRICS,
  ],
  [KBN_FIELD_TYPES.STRING]: [
    PIVOT_SUPPORTED_AGGS.CARDINALITY,
    PIVOT_SUPPORTED_AGGS.VALUE_COUNT,
    PIVOT_SUPPORTED_AGGS.FILTER,
    PIVOT_SUPPORTED_AGGS.TOP_METRICS,
    PIVOT_SUPPORTED_AGGS.TERMS,
  ],
  [KBN_FIELD_TYPES._SOURCE]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.UNKNOWN]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
  [KBN_FIELD_TYPES.CONFLICT]: [PIVOT_SUPPORTED_AGGS.VALUE_COUNT, PIVOT_SUPPORTED_AGGS.FILTER],
};

export const TOP_METRICS_SORT_FIELD_TYPES = [
  KBN_FIELD_TYPES.NUMBER,
  KBN_FIELD_TYPES.DATE,
  KBN_FIELD_TYPES.GEO_POINT,
];

export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortDirection = typeof SORT_DIRECTION[keyof typeof SORT_DIRECTION];

export const SORT_MODE = {
  MIN: 'min',
  MAX: 'max',
  AVG: 'avg',
  SUM: 'sum',
  MEDIAN: 'median',
} as const;

export const NUMERIC_TYPES_OPTIONS = {
  [KBN_FIELD_TYPES.NUMBER]: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
  [KBN_FIELD_TYPES.DATE]: [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DATE_NANOS],
};

export type KbnNumericType = typeof KBN_FIELD_TYPES.NUMBER | typeof KBN_FIELD_TYPES.DATE;

const SORT_NUMERIC_FIELD_TYPES = [
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.DATE,
  ES_FIELD_TYPES.DATE_NANOS,
] as const;

export type SortNumericFieldType = typeof SORT_NUMERIC_FIELD_TYPES[number];

export type SortMode = typeof SORT_MODE[keyof typeof SORT_MODE];

export const TOP_METRICS_SPECIAL_SORT_FIELDS = {
  _SCORE: '_score',
} as const;

export const isSpecialSortField = (sortField: unknown) => {
  return Object.values(TOP_METRICS_SPECIAL_SORT_FIELDS).some((v) => v === sortField);
};

export const isValidSortDirection = (arg: unknown): arg is SortDirection => {
  return Object.values(SORT_DIRECTION).some((v) => v === arg);
};

export const isValidSortMode = (arg: unknown): arg is SortMode => {
  return Object.values(SORT_MODE).some((v) => v === arg);
};

export const isValidSortNumericType = (arg: unknown): arg is SortNumericFieldType => {
  return SORT_NUMERIC_FIELD_TYPES.some((v) => v === arg);
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
  /**
   * Indicates if aggregation supports multiple fields
   */
  isMultiField?: boolean;
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

  if (agg === undefined) {
    throw new Error(`Aggregation key is required`);
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
  field: EsFieldName | EsFieldName[];
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

interface PivotAggsConfigTerms extends PivotAggsConfigWithUiBase {
  agg: typeof PIVOT_SUPPORTED_AGGS.TERMS;
  size: number;
}

export type PivotAggsConfigWithUiSupport =
  | PivotAggsConfigWithUiBase
  | PivotAggsConfigPercentiles
  | PivotAggsConfigTerms
  | PivotAggsConfigWithExtendedForm;

export function isPivotAggsConfigWithUiSupport(arg: unknown): arg is PivotAggsConfigWithUiSupport {
  return (
    isPopulatedObject(arg, ['agg', 'aggName', 'dropDownName', 'field']) &&
    isPivotSupportedAggs(arg.agg)
  );
}

/**
 * Union type for agg configs with extended forms
 */
type PivotAggsConfigWithExtendedForm = PivotAggsConfigFilter | PivotAggsConfigTopMetrics;

export function isPivotAggsWithExtendedForm(arg: unknown): arg is PivotAggsConfigWithExtendedForm {
  return isPopulatedObject(arg, ['AggFormComponent']);
}

export function isPivotAggConfigTopMetric(arg: unknown): arg is PivotAggsConfigTopMetrics {
  return isPivotAggsWithExtendedForm(arg) && arg.agg === PIVOT_SUPPORTED_AGGS.TOP_METRICS;
}

export function isPivotAggsConfigPercentiles(arg: unknown): arg is PivotAggsConfigPercentiles {
  return (
    isPopulatedObject(arg, ['agg', 'field', 'percents']) &&
    arg.agg === PIVOT_SUPPORTED_AGGS.PERCENTILES
  );
}

export function isPivotAggsConfigTerms(arg: unknown): arg is PivotAggsConfigTerms {
  return isPopulatedObject(arg, ['agg', 'field', 'size']) && arg.agg === PIVOT_SUPPORTED_AGGS.TERMS;
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
