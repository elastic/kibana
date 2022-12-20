/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SLO } from '../../../typings';
import { SortType } from '../components/slo_list_search_filter_sort_bar';
import { getSloDifference } from './get_slo_difference';

export function sortSlos(sort: SortType | undefined) {
  return function (a: SLO, b: SLO) {
    if (sort === 'difference') {
      const { value: differenceA } = getSloDifference(a);
      const { value: differenceB } = getSloDifference(b);
      return differenceA - differenceB;
    }
    if (sort === 'budgetRemaining') {
      return a.summary.errorBudget.remaining - b.summary.errorBudget.remaining;
    }
    return 0;
  };
}
