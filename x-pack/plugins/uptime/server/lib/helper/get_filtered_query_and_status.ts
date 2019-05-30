/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getFilteredQuery } from './get_filtered_query';

/**
 * Returns a boolean representing whether or not the object is a valid status filter.
 * @param clauseToCheck an object that may be a status filter
 */
const isStatusFilter = (clauseToCheck: any): boolean =>
  !!(clauseToCheck.match && clauseToCheck.match['monitor.status']) || false;

/**
 * Checks for a status filter object, or if the given parameter is an array with
 * a nested status filter object.
 * @param filterClause an object containing a status filter, or an array with an object
 * containing a filter.
 */
const hasStatusFilter = (filterClause: any): boolean => {
  const mustClause = get<object | undefined>(filterClause, 'bool.must');
  if (Array.isArray(mustClause)) {
    return mustClause
      .map(childClause => isStatusFilter(childClause))
      .reduce((prev, cur) => prev || cur, false);
  }

  return isStatusFilter(filterClause);
};

/**
 * Sometimes the library that generates our ES filters creates a nested filter object that contains
 * a status filter. We won't be able to supporty deeply-nested status in the short term, and our roadmpa
 * plans to deprecate some features that necessitate all this extra logic.
 *
 * In the meantime, we will support top-level status post-processing. To that end, this function will
 * return the status value like we have in previous versions, and handle the additional nested query.
 * @param statusFilter an object potentially containing a status value
 * @example
 * // returns 'down'
 * getStatusClause(JSON.parse(`
 *   [
 *     {
 *       "match": {
 *         "monitor.status": {
 *           "query": "down",
 *           "operator": "and"
 *         }
 *       }
 *     }
 *  ]`))
 * @example
 * // returns 'up'
 * getStatusClause(JSON.parse(`
 *   [
 *     {
 *       "bool": {
 *         "must": [
 *           {
 *             "match": {
 *               "monitor.status": {
 *                 "query": "up",
 *                 "operator": "and"
 *               }
 *             }
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * `))
 */
const getStatusClause = (statusFilter: any): string | undefined => {
  // the status clause was not nested
  if (Array.isArray(statusFilter) && statusFilter.some(c => c.match && c.match['monitor.status'])) {
    return statusFilter.find(l => l.match['monitor.status']).match['monitor.status'].query;
  } else if (Array.isArray(statusFilter)) {
    // the status clause was nested
    return statusFilter
      .map(clause =>
        clause.bool && clause.bool.must && clause.bool.must.length ? clause.bool.must : []
      )
      .reduce((prev, cur) => {
        const statusClause = cur.find((clause: any) =>
          get(clause, ['match', 'monitor.status', 'query'])
        );
        const statusString = get<string | undefined>(statusClause, [
          'match',
          'monitor.status',
          'query',
        ]);
        return statusString || prev;
      }, undefined);
  }
  return undefined;
};

/**
 * This function extracts the status query from the other filters and returns it, if it exists.
 * @param filters the filter string
 */
const getStatusFilter = (filters: any): string | undefined => {
  const must = get(filters, 'bool.must', []);
  if (must && must.length) {
    const statusFilter = filters.bool.must.filter((filter: any) => hasStatusFilter(filter));
    return getStatusClause(statusFilter);
  }
};

/**
 * This function exists to parse the filter parameters provided by the client.
 * It also isolates filters targeting the monitor.status field, because we often
 * need to apply that filter in memory after ES returns query results.
 *
 * @param dateRangeStart the beginning of the date range filter
 * @param dateRangeEnd the end of the date range filter
 * @param filters additional filters, if any
 */
export const getFilteredQueryAndStatusFilter = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string | null
) => {
  let statusFilter: string | undefined;
  let filterObject: any;
  let nonStatusFilters;
  if (filters) {
    filterObject = JSON.parse(filters);
    statusFilter = getStatusFilter(filterObject);
    nonStatusFilters = getFilteredQuery(dateRangeStart, dateRangeEnd, {
      bool: {
        must: filterObject.bool.must.filter(
          (filter: any) =>
            (filter.match && !filter.match['monitor.status']) ||
            filter.simple_query_string ||
            filter.bool
        ),
      },
    });
  } else {
    nonStatusFilters = getFilteredQuery(dateRangeStart, dateRangeEnd);
  }

  return {
    query: nonStatusFilters,
    statusFilter,
  };
};
