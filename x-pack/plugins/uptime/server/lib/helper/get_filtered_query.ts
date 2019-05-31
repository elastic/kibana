/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { QUERY } from '../../../common/constants';

/**
 * Checks if a clause is attempting to match on the monitor.status field.
 * @param clause the POJO to test for a status filter
 */
const identifyStatusClause = (clause: any) => !get(clause, ['match', 'monitor.status']);

/**
 * Handles cases where the status filter is nested within a list of `must` or `should` clauses.
 * If the supplied value is not an array, it is simply returned as-is.
 * @param query the query to filter
 */
const removeNestedStatusQuery = (query: any) => {
  if (Array.isArray(query)) {
    return query.map((clauses: any) => {
      if (clauses.bool && clauses.bool.must) {
        clauses.bool.must = get<any[]>(clauses, 'bool.must', []).filter(identifyStatusClause);
      }
      if (clauses.bool && clauses.bool.should) {
        clauses.bool.should = get<any[]>(clauses, 'bool.should', []).filter(identifyStatusClause);
      }
      return clauses;
    });
  }
  return query;
};

/**
 * The purpose of this function is to return a filter query without a clause
 * targeting monitor.status. This is useful because a number of our queries rely
 * on post-processing to filter on status.
 * @param dateRangeStart the beginning of the range
 * @param dateRangeEnd the end of the range
 * @param filters any additional filter clauses
 */
export const getFilteredQuery = (
  dateRangeStart: string,
  dateRangeEnd: string,
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
    const userFilters = get(filtersObj, 'bool.must', []).map((filter: any) =>
      filter.simple_query_string
        ? {
            simple_query_string: {
              ...filter.simple_query_string,
              fields: QUERY.SIMPLE_QUERY_STRING_FIELDS,
            },
          }
        : filter
    );
    delete filtersObj.bool.must;
    filtersObj.bool.filter = [...removeNestedStatusQuery(userFilters)];
  }
  const query = { ...filtersObj };
  const rangeSection = {
    range: {
      '@timestamp': {
        gte: dateRangeStart,
        lte: dateRangeEnd,
      },
    },
  };
  if (get(query, 'bool.filter', undefined)) {
    query.bool.filter.push(rangeSection);
  } else {
    set(query, 'bool.filter', [rangeSection]);
  }
  return query;
};
