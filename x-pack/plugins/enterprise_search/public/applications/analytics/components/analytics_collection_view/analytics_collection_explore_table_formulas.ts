/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/data-plugin/common';

export const getSearchQueryRequestParams = (search: string): { include?: string } => {
  const createRegexQuery = (queryString: string) => {
    let query = queryString.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    query = query
      .split('')
      .map((char) => {
        if (/[a-z]/.test(char)) {
          return `[${char}${char.toUpperCase()}]`;
        }
        return char;
      })
      .join('');
    query = `.*${query}.*`;
    if (queryString.length > 2) {
      query = `([a-zA-Z]+ )+?${query}`;
    }

    return query;
  };

  return { include: search ? createRegexQuery(search) : undefined };
};
export const getTotalCountRequestParams = (field: string) => ({
  totalCount: {
    cardinality: {
      field,
    },
  },
});
export const getPaginationRequestSizeParams = (pageIndex: number, pageSize: number) => ({
  size: (pageIndex + 1) * pageSize,
});
export const getPaginationRequestParams = (pageIndex: number, pageSize: number) => ({
  aggs: {
    sort: {
      bucket_sort: {
        from: pageIndex * pageSize,
        size: pageSize,
      },
    },
  },
});

export const getBaseRequestParams = (timeRange: TimeRange) => ({
  query: {
    range: {
      '@timestamp': {
        gte: timeRange.from,
        lt: timeRange.to,
      },
    },
  },
  size: 0,
  track_total_hits: false,
});
