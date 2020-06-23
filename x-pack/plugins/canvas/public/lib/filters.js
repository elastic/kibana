/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 TODO: This could be pluggable
*/

export function time(filter) {
  if (!filter.column) {
    throw new Error('column is required for Elasticsearch range filters');
  }
  return {
    range: {
      [filter.column]: { gte: filter.from, lte: filter.to },
    },
  };
}

export function luceneQueryString(filter) {
  return {
    query_string: {
      query: filter.query || '*',
    },
  };
}

export function exactly(filter) {
  return {
    term: {
      [filter.column]: {
        value: filter.value,
      },
    },
  };
}
