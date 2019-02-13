/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: This could be pluggable

export interface TimeFilter {
  type: string;
  column: string;
  from: string;
  to: string;
}

export interface ExactlyFilter {
  type: string;
  column: string;
  value: string;
}

export interface LuceneQueryStringFilter {
  type: string;
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
