/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaSearchResponse, IEsSearchRequest } from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';

/**
 * Reusable method that returns a promise wrapping the search functionality of Kibana search service
 */
export const createFetchData = async <TResponse, T = {}>(
  searchService: ISearchStart,
  req: IEsSearchRequest
): Promise<TResponse> => {
  let rawResponse: TResponse;
  return new Promise((resolve, reject) => {
    searchService.search<IEsSearchRequest, IKibanaSearchResponse<TResponse>>(req).subscribe({
      next: (response) => {
        rawResponse = response.rawResponse;
      },
      complete: () => {
        resolve(rawResponse);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};
