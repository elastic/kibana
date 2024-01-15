/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IEsSearchRequest,
  IKibanaSearchResponse,
  isRunningResponse,
} from '@kbn/data-plugin/common';
import { ISearchStart } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME } from '../../common/constants';

interface SearchOptions {
  /**
   * Inspector adapter. Pass this when available in the upper scope to display request diagnostics.
   */
  inspectorAdapter?: RequestAdapter;

  /**
   * Request name registered in the inspector panel
   */
  requestName: string;

  /**
   * Abort signal
   */
  signal?: AbortSignal;

  /**
   * Do not use default plugin search strategy
   */
  skipDefaultStrategy?: boolean;
}

/**
 * Handles optional access to RequestAdapter
 */
const requestInspector = (
  inspectorAdapter: RequestAdapter | undefined,
  { requestName }: { requestName: string }
) => {
  const requestId = `${Date.now()}`;

  const inspectorRequest = inspectorAdapter?.start(requestName, { id: requestId });

  return {
    recordRequestError(error: any) {
      if (!inspectorRequest) {
        return;
      }
      inspectorRequest.error({ json: error });
    },

    recordRequestCompletion(searchRequest: IEsSearchRequest, response: IKibanaSearchResponse) {
      if (!inspectorRequest) {
        return;
      }

      inspectorRequest.stats({}).ok({ json: response });
      inspectorRequest.json(searchRequest.params?.body || {});
    },

    resetRequest() {
      if (!inspectorAdapter) {
        return;
      }

      inspectorAdapter.resetRequest(requestId);
    },
  };
};

/**
 * This is a searchService wrapper that will instrument your query with `inspector` and turn it into a Promise,
 * resolved when complete result set is returned or rejected on any error, other than Abort.
 */
export const search = async <TResponse, T = {}>(
  searchService: ISearchStart,
  searchRequest: IEsSearchRequest & { factoryQueryType?: string } & T,
  { inspectorAdapter, requestName, signal, skipDefaultStrategy = false }: SearchOptions
): Promise<TResponse> => {
  const inspect = requestInspector(inspectorAdapter, { requestName });

  return new Promise((resolve, reject) => {
    searchService
      .search<IEsSearchRequest, IKibanaSearchResponse<TResponse>>(searchRequest, {
        abortSignal: signal,
        ...(skipDefaultStrategy ? {} : { strategy: THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME }),
      })
      .subscribe({
        next: (response) => {
          if (!isRunningResponse(response)) {
            inspect.recordRequestCompletion(searchRequest, response);
            resolve(response.rawResponse);
          }
        },
        error: (requestError) => {
          if (requestError instanceof Error && requestError.name.includes('Abort')) {
            inspect.resetRequest();
          } else {
            inspect.recordRequestError(requestError);
          }

          searchService.showError(requestError);
          reject(requestError);
        },
      });
  });
};
