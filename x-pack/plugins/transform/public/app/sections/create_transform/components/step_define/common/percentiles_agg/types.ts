/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { PIVOT_SUPPORTED_AGGS } from '../../../../../../../../common/types/pivot_aggs';

import type {
  PivotAggsConfigWithExtra,
  PivotAggsUtilsWithExtra,
} from '../../../../../../common/pivot_aggs';

export interface PercentilesAggConfig {
  /** Comma separated list */
  percents: string;
}
export type IPivotAggsConfigPercentiles = PivotAggsConfigWithExtra<PercentilesAggConfig>;

export const isPivotAggsConfigPercentiles = (arg: unknown): arg is IPivotAggsConfigPercentiles =>
  isPopulatedObject(arg, ['aggFormComponent']) &&
  arg.aggFormComponent === PIVOT_SUPPORTED_AGGS.PERCENTILES;

export type IPivotAggsUtilsPercentiles = PivotAggsUtilsWithExtra<
  PercentilesAggConfig,
  { field: string; percents: number[] }
>;
