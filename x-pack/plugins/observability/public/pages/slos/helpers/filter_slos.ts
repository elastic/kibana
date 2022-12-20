/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SLO } from '../../../typings';
import { SortItem } from '../components/slo_list_search_filter_sort_bar';
import { isSloHealthy } from './is_slo_healthy';

export function filterSlos(filters: SortItem[]) {
  return function (slo: SLO) {
    return filters.length
      ? filters.some((filter) => {
          if (filter.type === 'violated') {
            return !isSloHealthy(slo);
          }
          if (filter.type === 'healthy') {
            return isSloHealthy(slo);
          }
          return false;
        })
      : true;
  };
}
