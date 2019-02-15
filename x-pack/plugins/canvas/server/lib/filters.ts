/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: This could be pluggable

export interface CanvasQueryFilter {
  type: 'time' | 'exactly' | 'luceneQueryString';
}

export interface CanvasTimeFilter extends CanvasQueryFilter {
  type: 'time';
  column: string;
  from: string;
  to: string;
}

export interface CanvasExactlyFilter extends CanvasQueryFilter {
  type: 'exactly';
  column: string;
  value: string;
}

export interface CanvasLuceneQueryFilter extends CanvasQueryFilter {
  type: 'luceneQueryString';
  query: string;
}

export interface ElasticsearchTimeFilter {
  range: {
    [key: string]: {
      gte: string;
      lte: string;
    };
  };
}

export interface ElasticsearchLuceneQueryStringFilter {
  query_string: {
    query: string;
  };
}

export interface ElasticsarchTermFilter {
  term: {
    [x: string]: {
      value: string;
    };
  };
}

export function time(filter: CanvasTimeFilter): ElasticsearchTimeFilter {
  if (!filter.column) {
    throw new Error('column is required for Elasticsearch range filters');
  }

  return {
    range: {
      [filter.column]: { gte: filter.from, lte: filter.to },
    },
  };
}

export function luceneQueryString(
  filter: CanvasLuceneQueryFilter
): ElasticsearchLuceneQueryStringFilter {
  return {
    query_string: {
      query: filter.query || '*',
    },
  };
}

export function exactly(filter: CanvasExactlyFilter): ElasticsarchTermFilter {
  return {
    term: {
      [filter.column]: {
        value: filter.value,
      },
    },
  };
}
