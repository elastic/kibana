/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FilterType,
  ExpressionValueFilter,
  CanvasTimeFilter,
  CanvasLuceneFilter,
  CanvasExactlyFilter,
} from '../../types';

/*
 TODO: This could be pluggable
*/

const isTimeFilter = (
  maybeTimeFilter: ExpressionValueFilter
): maybeTimeFilter is CanvasTimeFilter => {
  return maybeTimeFilter.filterType === FilterType.time;
};
const isLuceneFilter = (
  maybeLuceneFilter: ExpressionValueFilter
): maybeLuceneFilter is CanvasLuceneFilter => {
  return maybeLuceneFilter.filterType === FilterType.luceneQueryString;
};
const isExactlyFilter = (
  maybeExactlyFilter: ExpressionValueFilter
): maybeExactlyFilter is CanvasExactlyFilter => {
  return maybeExactlyFilter.filterType === FilterType.exactly;
};

export function time(filter: ExpressionValueFilter) {
  if (!isTimeFilter(filter) || !filter.column) {
    throw new Error('column is required for Elasticsearch range filters');
  }
  return {
    range: {
      [filter.column]: { gte: filter.from, lte: filter.to },
    },
  };
}

export function luceneQueryString(filter: ExpressionValueFilter) {
  if (!isLuceneFilter(filter)) {
    throw new Error('Filter is not a lucene filter');
  }
  return {
    query_string: {
      query: filter.query || '*',
    },
  };
}

export function exactly(filter: ExpressionValueFilter) {
  if (!isExactlyFilter(filter)) {
    throw new Error('Filter is not an exactly filter');
  }
  return {
    term: {
      [filter.column]: {
        value: filter.value,
      },
    },
  };
}

export const filters: Record<string, any> = {
  exactly,
  time,
  luceneQueryString,
};
