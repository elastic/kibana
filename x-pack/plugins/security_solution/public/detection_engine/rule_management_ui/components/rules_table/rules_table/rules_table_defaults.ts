/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptions, SortingOptions } from '../../../../rule_management/logic/types';

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  filter: '',
  tags: [],
  showCustomRules: false,
  showElasticRules: false,
};
export const DEFAULT_SORTING_OPTIONS: SortingOptions = {
  field: 'enabled',
  order: 'desc',
};
export const DEFAULT_PAGE = 1;
export const DEFAULT_RULES_PER_PAGE = 20;
