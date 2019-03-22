/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, omit } from 'lodash';
import { QUERY } from '../../../common/constants';
import { getFilteredQuery } from './get_filtered_query';

/**
 * This function extracts the filter query from the other filters and returns it, if it exists.
 * @param filters the filter string
 */
const getMonitorsListFilteredQuery = (filters: any): string | undefined => {
  const must = get(filters, 'bool.must', []);
  if (must && must.length) {
    const statusFilter = filters.bool.must.filter(
      (filter: any) => filter.match && filter.match['monitor.status']
    );
    if (statusFilter.length) {
      return statusFilter[0].match['monitor.status'].query;
    }
  }
};

/**
 * When the client's search component generates a simple_query_string, it doesn't
 * provide a set of fields for ES to search. This function will apply a default set
 * of fields to each of those.
 * @param filter - an object that may or may not contain a simple_query_string
 */
const addFieldsToSimpleQuery = (filter: any) =>
  filter.simple_query_string
    ? {
        ...omit(filter, 'simple_query_string'),
        simple_query_string: {
          ...filter.simple_query_string,
          fields: QUERY.SIMPLE_QUERY_STRING_FIELDS,
        },
      }
    : filter;

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
  if (filters) {
    const filterObject = JSON.parse(filters);

    /**
     * Select all `must` and `must_not`, excepting `monitor.status` match if added
     * by our filter button, which will always be `must`. Providing them to
     * `getFilteredQuery` will transfer our `must` keys to `filter`, because
     * none of our queries require scoring. Lastly, we get the status filter
     * if it exists, so client code can perform post-query processing.
     */
    const otherFilters = getFilteredQuery(dateRangeStart, dateRangeEnd, {
      bool: {
        must: get(filterObject, 'bool.must', [])
          .filter((filter: any) => !filter.match || !filter.match['monitor.status'])
          .map(addFieldsToSimpleQuery),
        must_not: get(filterObject, 'bool.must_not', []).map(addFieldsToSimpleQuery),
      },
    });

    /**
     * Some of the lists we build require filtering based on status, and if we were to
     * apply that filter to the query, we'd lose monitors whose status has changed.
     *
     * In the future we should be able to remove this code, once Heartbeat tracks a
     * state index that will eliminate our heavy reliance on aggregation.
     */
    const statusFilter: string | undefined = getMonitorsListFilteredQuery(filterObject);

    return {
      query: otherFilters,
      statusFilter,
    };
  }

  return {
    query: getFilteredQuery(dateRangeStart, dateRangeEnd),
  };
};
