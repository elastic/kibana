/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { QUERY } from '../../../common/constants';

const identifyStatusClause = (item: any) => !get(item, ['match', 'monitor.status']);

const removeNestedStatusQuery = (item: any) => {
  if (Array.isArray(item)) {
    return item.map((value: any) => {
      if (value.bool && value.bool.must) {
        value.bool.must = get<any[]>(value, 'bool.must', []).filter(identifyStatusClause);
      }
      if (value.bool && value.bool.should) {
        value.bool.should = get<any[]>(value, 'bool.should', []);
      }
      return value;
    });
  }
  return item;
};

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
