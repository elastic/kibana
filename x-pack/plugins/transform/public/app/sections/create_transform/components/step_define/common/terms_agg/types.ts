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

export interface TermsAggConfig {
  size: number;
}
export type IPivotAggsConfigTerms = PivotAggsConfigWithExtra<TermsAggConfig>;

export const isPivotAggsConfigTerms = (arg: unknown): arg is IPivotAggsConfigTerms =>
  isPopulatedObject(arg, ['aggFormComponent']) &&
  arg.aggFormComponent === PIVOT_SUPPORTED_AGGS.TERMS;

export type IPivotAggsUtilsTerms = PivotAggsUtilsWithExtra<
  TermsAggConfig,
  { field: string; size: number }
>;
