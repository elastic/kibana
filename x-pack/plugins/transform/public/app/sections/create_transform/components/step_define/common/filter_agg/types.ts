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

interface FilterAggTypeConfig<U> {
  /** Form component */
  FilterAggFormComponent?: FilterAggForm<U>;
  /** Filter agg type configuration*/
  filterAggConfig?: U;
  /** Converts UI agg config form to ES agg request object */
  getEsAggConfig: (field?: string) => { [key: string]: any };
  isValid?: () => boolean;
}

/** Filter agg type definition */
interface FilterAggProps<K extends FilterAggType, U extends {}> {
  /** Filter aggregation type */
  filterAgg: K;
  /** Definition of the filter agg config */
  aggTypeConfig: FilterAggTypeConfig<U>;
}

/** Filter term agg */
export type FilterAggConfigTerm = FilterAggProps<'term', { value: string }>;
/** Filter range agg */
export type FilterAggConfigRange = FilterAggProps<
  'range',
  { gt?: number; lt?: number; lte?: number; gte?: number }
>;

export type FilterAggConfigUnion = FilterAggConfigTerm | FilterAggConfigRange;

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
