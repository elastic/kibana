/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-plugin/common';
import type { Rule, Pagination, Sorting, RuleStatus } from '../../../types';
import { transformRule } from './common_transformations';

export interface LoadRulesProps {
  http: HttpSetup;
  page: Pagination;
  searchText?: string;
  typesFilter?: string[];
  actionTypesFilter?: string[];
  tagsFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleStatusesFilter?: RuleStatus[];
  sort?: Sorting;
}

export const rewriteRulesResponseRes = (results: Array<AsApiContract<Rule>>): Rule[] => {
  return results.map((item) => transformRule(item));
};
