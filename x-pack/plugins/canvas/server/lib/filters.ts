/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: This could be pluggable

export interface GenericFilter {
  type: 'time' | 'exactly' | 'luceneQueryString';
}

export interface TimeFilter extends GenericFilter {
  type: 'time';
  column: string;
  from: string;
  to: string;
}

export interface ExactlyFilter extends GenericFilter {
  type: 'exactly';
  column: string;
  value: string;
}

export interface LuceneQueryStringFilter extends GenericFilter {
  type: 'luceneQueryString';
  query: string;
}

export function time(filter: TimeFilter) {
  if (!filter.column) {
    throw new Error('column is required for Elasticsearch range filters');
  }

  return {
    range: {
      [filter.column]: { gte: filter.from, lte: filter.to },
    },
  };
}

export function luceneQueryString(filter: LuceneQueryStringFilter) {
  return {
    query_string: {
      query: filter.query || '*',
    },
  };
}

export function exactly(filter: ExactlyFilter) {
  return {
    term: {
      [filter.column]: {
        value: filter.value,
      },
    },
  };
}
