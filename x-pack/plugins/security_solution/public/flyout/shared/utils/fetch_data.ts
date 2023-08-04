/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/public';

export const AGG_KEY = 'aggregation';

/**
 * Interface for aggregation responses
 */
export interface RawAggregatedDataResponse {
  aggregations: {
    [AGG_KEY]: {
      buckets: unknown[];
    };
  };
}

/**
 * Interface for non-aggregated responses
 */
export interface RawResponse {
  hits: {
    total: number;
  };
}

/**
 * Reusable method that returns a promise wrapping the search functionality of Kibana search service
 */
export const createFetchData = async <TResponse, T = {}>(
  searchService: ISearchStart,
  req: IEsSearchRequest
): Promise<TResponse> => {
  return new Promise((resolve, reject) => {
    searchService.search<IEsSearchRequest, IKibanaSearchResponse<TResponse>>(req).subscribe({
      next: (response) => {
        resolve(response.rawResponse);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};
