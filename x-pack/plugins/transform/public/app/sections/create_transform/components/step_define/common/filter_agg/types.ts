/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';
import { PivotAggsConfigWithExtra } from '../../../../../../common/pivot_aggs';
import { FILTERS } from './constants';

export type FilterAggType = typeof FILTERS[keyof typeof FILTERS];

type FilterAggForm<T> = FC<{
  /** Filter aggregation related configuration */
  config: Partial<T> | undefined;
  /** Callback for configuration updates */
  onChange: (arg: Partial<{ config: Partial<T> }>) => void;
  /** Selected field for the aggregation */
  selectedField?: string;
}>;

interface FilterAggTypeConfig<U, R> {
  /** Form component */
  FilterAggFormComponent?: U extends undefined ? undefined : FilterAggForm<U>;
  /** Filter agg type configuration*/
  filterAggConfig?: U extends undefined ? undefined : U;
  /** Converts UI agg config form to ES agg request object */
  getEsAggConfig: (field?: string) => R;
  isValid?: () => boolean;
  /** Provides aggregation name generated based on the configuration */
  getAggName?: () => string | undefined;
  /** Helper text for the aggregation reflecting some configuration info */
  helperText?: () => string | undefined;
}

/** Filter agg type definition */
interface FilterAggProps<K extends FilterAggType, U, R = { [key: string]: any }> {
  /** Filter aggregation type */
  filterAgg: K;
  /** Definition of the filter agg config */
  aggTypeConfig: FilterAggTypeConfig<U, R>;
}

/** Filter term agg */
export type FilterAggConfigTerm = FilterAggProps<
  'term',
  { value: string },
  { [field: string]: string }
>;
/** Filter range agg */
export type FilterAggConfigRange = FilterAggProps<
  'range',
  { from?: number; to?: number; includeFrom?: boolean; includeTo?: boolean },
  { [field: string]: { [key in 'gt' | 'gte' | 'lt' | 'lte']: number } }
>;
/** Filter exists agg */
export type FilterAggConfigExists = FilterAggProps<'exists', undefined, { field: string }>;
/** Filter bool agg */
export type FilterAggConfigBool = FilterAggProps<'bool', string>;

/** General type for filter agg */
export type FilterAggConfigEditor = FilterAggProps<FilterAggType, string>;

export type FilterAggConfigUnion =
  | FilterAggConfigTerm
  | FilterAggConfigRange
  | FilterAggConfigBool
  | FilterAggConfigExists;

/**
 * Union type for filter aggregations
 * TODO find out if it's possible to use {@link FilterAggConfigUnion} instead of {@link FilterAggConfigBase}.
 * ATM TS is not able to infer a type.
 */
export type PivotAggsConfigFilter = PivotAggsConfigWithExtra<FilterAggConfigBase>;

export interface FilterAggConfigBase {
  filterAgg?: FilterAggType;
  aggTypeConfig?: any;
}
