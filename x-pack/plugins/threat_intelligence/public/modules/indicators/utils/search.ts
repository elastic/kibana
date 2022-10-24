/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IEsSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '@kbn/data-plugin/common';
import { ISearchStart } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

interface SearchOptions {
  /**
   * Inspector adapter, available in the context
   */
  inspectorAdapter: RequestAdapter;

  /**
   * Request name registered in the inspector panel
   */
  requestName: string;

  /**
   * Abort signal
   */
  signal?: AbortSignal;
}

/**
 * This is a searchService wrapper that will instrument your query with `inspector` and turn it into a Promise,
 * resolved when complete result set is returned or rejected on any error, other than Abort.
 */
export const search = async <TResponse>(
  searchService: ISearchStart,
  searchRequest: IEsSearchRequest,
  { inspectorAdapter, requestName, signal }: SearchOptions
): Promise<TResponse> => {
  const requestId = `${Date.now()}`;
  const request = inspectorAdapter.start(requestName, { id: requestId });

  return new Promise((resolve, reject) => {
    searchService
      .search<IEsSearchRequest, IKibanaSearchResponse<TResponse>>(searchRequest, {
        abortSignal: signal,
      })
      .subscribe({
        next: (response) => {
          if (isCompleteResponse(response)) {
            request.stats({}).ok({ json: response });
            request.json(searchRequest.params?.body || {});

            resolve(response.rawResponse);
          } else if (isErrorResponse(response)) {
            request.error({ json: response });
            reject(response);
          }
        },
        error: (requestError) => {
          if (requestError instanceof Error && requestError.name.includes('Abort')) {
            inspectorAdapter.resetRequest(requestId);
          } else {
            request.error({ json: requestError });
          }

          searchService.showError(requestError);
          reject(requestError);
        },
      });
  });
};
