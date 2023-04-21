/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaSearchRequest, TimeRange } from '@kbn/data-plugin/common';

const getSearchQueryRequestParams = (field: string, search: string): { regexp: {} } => {
  const createRegexQuery = (queryString: string) => {
    const query = queryString.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

    return `.*${query}.*`;
  };

  return {
    regexp: {
      [field]: {
        value: createRegexQuery(search),
      },
    },
  };
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

export const getBaseSearchTemplate = (
  aggregationFieldName: string,
  { search, timeRange }: { search: string; timeRange: TimeRange },
  aggs: IKibanaSearchRequest['params']['aggs']
): IKibanaSearchRequest => ({
  params: {
    aggs,
    query: {
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: timeRange.from,
                lt: timeRange.to,
              },
            },
          },
          ...(search ? [getSearchQueryRequestParams(aggregationFieldName, search)] : []),
        ],
      },
    },
    size: 0,
    track_total_hits: false,
  },
});
