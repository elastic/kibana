/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getFilteredQuery } from './get_filtered_query';

const getMonitorsListFilteredQuery = (filters: any): string | undefined => {
  const must = get(filters, 'bool.must', []);
  if (must && must.length) {
    const statusFilter = filters.bool.must.filter((filter: any) => filter.match['monitor.status']);
    if (statusFilter.length) {
      return statusFilter[0].match['monitor.status'].query;
    }
  }
};

export const getFilteredQueryAndStatusFilter = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string | null
) => {
  let statusFilter: string | undefined;
  let filterObject: any;
  let nonStatusFiters;
  if (filters) {
    filterObject = JSON.parse(filters);
    nonStatusFiters = getFilteredQuery(dateRangeStart, dateRangeEnd, {
      bool: {
        must: filterObject.bool.must.filter((filter: any) => !filter.match['monitor.status']),
      },
    });
    statusFilter = getMonitorsListFilteredQuery(filterObject);
  } else {
    nonStatusFiters = getFilteredQuery(dateRangeStart, dateRangeEnd);
  }

  return {
    query: nonStatusFiters,
    statusFilter,
  };
};
