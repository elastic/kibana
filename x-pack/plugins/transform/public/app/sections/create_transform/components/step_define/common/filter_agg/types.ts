/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';
import { FilterAggType } from './constants';
import { ValidationResult } from '../../../../../../../../../ml/common/util/validators';
import { PivotAggsConfigWithExtra } from '../../../../../../common/pivot_aggs';

type FilterAggForm<T> = FC<{
  /** Filter aggregation related configuration */
  config: Partial<T> | undefined;
  /** Callback for configuration updates */
  onChange: (arg: Partial<{ config: Partial<T>; validationResult: ValidationResult }>) => void;
  /** Selected field for the aggregation */
  selectedField?: string;
}>;

interface FilterAggTypeConfig<U> {
  /** Form component */
  FilterAggFormComponent: FilterAggForm<U>;
  /** Filter agg type configuration*/
  filterAggConfig?: U;
  /**
   * Mappers for aggregation objects
   */
  setUiConfigFromEs: (arg: { [key: string]: any }) => any;
  /** Converts UI agg config form to ES agg request object */
  getEsAggConfig: (field?: string) => { [key: string]: any };
  isValid?: () => boolean;
}

/** Filter agg type definition */
interface FilterAggProps<K extends FilterAggType, U> {
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
  { gt?: string; lt?: string; lte?: string; gte?: string }
>;

export type FilterAggConfigUnion = FilterAggConfigTerm | FilterAggConfigRange;

/** Union type for filter aggregations */
export type PivotAggsConfigFilter = PivotAggsConfigWithExtra<FilterAggConfigUnion>;

export interface FilterAggConfigBase {
  filterAgg?: FilterAggType;
  aggTypeConfig?: any;
}

export function isPivotAggsConfigFilter(arg: any): arg is PivotAggsConfigFilter {
  return arg?.aggConfig?.filterAgg !== undefined;
}

export type PivotAggsConfigFilterInit = Omit<PivotAggsConfigFilter, 'aggConfig'> & {
  aggConfig: FilterAggConfigBase;
};
