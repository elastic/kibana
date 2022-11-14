/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptions, SortingOptions } from '../../../../rule_management/logic/types';

export interface RulesTableSavedState {
  isInMemorySorting: boolean;
  filterOptions: FilterOptions;
  sorting: SortingOptions;
  page: number;
  perPage: number;
}
