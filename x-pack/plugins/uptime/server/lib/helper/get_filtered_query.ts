/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';

export const getFilteredQuery = (
  dateRangeStart: string | null,
  dateRangeEnd: string | null,
  filters?: string | null | any
) => {
  let filtersObj;
  // TODO: handle bad JSON gracefully
  if (typeof filters === 'string') {
    filtersObj = JSON.parse(filters);
  } else {
    filtersObj = filters;
  }
  if (get(filtersObj, 'bool.must', undefined)) {
    const userFilters = get(filtersObj, 'bool.must', []);
    delete filtersObj.bool.must;
    filtersObj.bool.filter = [...userFilters];
  }
  const query = { ...filtersObj };

  if (!dateRangeStart && !dateRangeEnd) {
    return query;
  }

  const timestampRange: { lte?: string; gte?: string } = {};
  if (dateRangeStart) {
    timestampRange.gte = dateRangeStart;
  }
  if (dateRangeEnd) {
    timestampRange.lte = dateRangeEnd;
  }
  const rangeSection = { range: { '@timestamp': timestampRange } };

  if (get(query, 'bool.filter', undefined)) {
    query.bool.filter.push(rangeSection);
  } else {
    set(query, 'bool.filter', [rangeSection]);
  }
  return query;
};
