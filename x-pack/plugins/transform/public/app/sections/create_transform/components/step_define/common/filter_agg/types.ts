/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { PIVOT_SUPPORTED_AGGS } from '../../../../../../../../common/types/pivot_aggs';
import type {
  PivotAggsConfigWithExtra,
  PivotAggsUtilsWithExtra,
} from '../../../../../../common/pivot_aggs';
import { FILTERS } from './constants';

export type FilterAggType = typeof FILTERS[keyof typeof FILTERS];

export type FilterAggForm<T> = FC<{
  /** Filter aggregation related configuration */
  config: Partial<T> | undefined;
  /** Callback for configuration updates */
  onChange: (arg: Partial<{ config: Partial<T> }>) => void;
  /** Selected field for the aggregation */
  selectedField?: string;
  /** Whether the configuration is valid */
  isValid?: boolean;
}>;

interface FilterAggTypeUtils<ESConfig extends { [key: string]: any }> {
  /** Converts UI agg config form to ES agg request object */
  getEsAggConfig: (field?: string) => ESConfig;
  /** Validation result of the filter agg config */
  isValid?: () => boolean;
  /** Provides aggregation name generated based on the configuration */
  getAggName?: () => string | undefined;
  /** Helper text for the aggregation reflecting some configuration info */
  helperText?: () => string | undefined;
}

type FilterAttFormComponentName =
  | 'filterTermForm'
  | 'filterRangeForm'
  | 'filterExistsForm'
  | 'filterBoolForm'
  | 'filterEditorForm';

interface FilterAggTypeConfig<T extends FilterAttFormComponentName, U> {
  /** Form component */
  filterAggFormComponent: T;
  /** Filter agg type configuration*/
  filterAggConfig?: U extends undefined ? undefined : U;
  /** Field name. In some cases, e.g. `exists` filter, it's resolved from the filter agg definition */
  fieldName?: string;
}

/** Filter agg type definition */
interface FilterAggProps<T extends FilterAttFormComponentName, K extends FilterAggType, U> {
  /** Filter aggregation type */
  filterAgg: K;
  /** Definition of the filter agg config */
  aggTypeConfig: FilterAggTypeConfig<T, U>;
}

/** Filter term agg */
export interface FilterAggTypeConfigTerm {
  value: string;
}
export type FilterAggConfigTerm = FilterAggProps<'filterTermForm', 'term', FilterAggTypeConfigTerm>;

export const isFilterAggConfigTerm = (
  arg: unknown
): arg is FilterAggTypeConfig<'filterTermForm', FilterAggTypeConfigTerm> =>
  isPopulatedObject(arg, ['filterAggFormComponent']) &&
  arg.filterAggFormComponent === 'filterTermForm';

export type FilterAggUtilsTerm = FilterAggTypeUtils<{ [field: string]: string }>;

/** Filter range agg */
export interface FilterAggTypeConfigRange {
  from?: number;
  to?: number;
  includeFrom?: boolean;
  includeTo?: boolean;
}

export type FilterAggConfigRange = FilterAggProps<
  'filterRangeForm',
  'range',
  FilterAggTypeConfigRange
>;

export const isFilterAggConfigRange = (
  arg: unknown
): arg is FilterAggConfigRange['aggTypeConfig'] =>
  isPopulatedObject(arg, ['filterAggFormComponent']) &&
  arg.filterAggFormComponent === 'filterRangeForm';

export type FilterAggUtilsRange = FilterAggTypeUtils<{
  [field: string]: { [key in 'gt' | 'gte' | 'lt' | 'lte']: number };
}>;

/** Filter exists agg */
export type FilterAggConfigExists = FilterAggProps<'filterExistsForm', 'exists', undefined>;

export const isFilterAggConfigExists = (
  arg: unknown
): arg is FilterAggConfigExists['aggTypeConfig'] =>
  isPopulatedObject(arg, ['filterAggFormComponent']) &&
  arg.filterAggFormComponent === 'filterExistsForm';

export type FilterAggUtilsExists = FilterAggTypeUtils<{ field: string }>;

/** Filter bool agg */
export type FilterAggConfigBool = FilterAggProps<'filterBoolForm', 'bool', string>;

export const isFilterAggConfigBool = (arg: unknown): arg is FilterAggConfigBool['aggTypeConfig'] =>
  isPopulatedObject(arg, ['filterAggFormComponent']) &&
  arg.filterAggFormComponent === 'filterBoolForm';

export type FilterAggUtilsBool = FilterAggTypeUtils<{
  must?: object[];
  must_not?: object[];
  should?: object[];
}>;

/** General type for filter agg */
export type FilterAggTypeConfigEditor = string;
export type FilterAggConfigEditor = FilterAggProps<
  'filterEditorForm',
  FilterAggType,
  FilterAggTypeConfigEditor
>;

export const isFilterAggConfigEditor = (
  arg: unknown
): arg is FilterAggTypeConfig<'filterEditorForm', FilterAggTypeConfigEditor> =>
  isPopulatedObject(arg, ['filterAggFormComponent']) &&
  arg.filterAggFormComponent === 'filterEditorForm';

export type FilterAggUtilsEditor = FilterAggTypeUtils<Record<string, unknown>>;

export type FilterAggConfigUnion =
  | FilterAggConfigTerm
  | FilterAggConfigRange
  | FilterAggConfigBool
  | FilterAggConfigExists
  | FilterAggConfigEditor;
export type FilterAggUtilsUnion =
  | FilterAggUtilsTerm
  | FilterAggUtilsRange
  | FilterAggUtilsBool
  | FilterAggUtilsExists
  | FilterAggUtilsEditor;

/**
 * Union type for filter aggregations
 * TODO find out if it's possible to use {@link FilterAggConfigUnion} instead of {@link FilterAggConfigBase}.
 * ATM TS is not able to infer a type.
 */
export type PivotAggsConfigFilter = PivotAggsConfigWithExtra<FilterAggConfigBase>;

export const isPivotAggsConfigFilter = (arg: unknown): arg is PivotAggsConfigFilter =>
  isPopulatedObject(arg, ['aggFormComponent']) &&
  arg.aggFormComponent === PIVOT_SUPPORTED_AGGS.FILTER;

export type PivotAggsUtilsFilter = PivotAggsUtilsWithExtra<FilterAggConfigBase, {}>;

export interface FilterAggConfigBase {
  filterAgg?: FilterAggType;
  aggTypeConfig?: any;
}
