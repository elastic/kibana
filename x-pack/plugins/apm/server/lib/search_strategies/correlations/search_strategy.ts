/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { of } from 'rxjs';

import type { ISearchStrategy } from '../../../../../../../src/plugins/data/server';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../../src/plugins/data/common';

import type {
  SearchServiceParams,
  SearchServiceRawResponse,
  SearchServiceValue,
} from '../../../../common/search_strategies/correlations/types';

import type { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';

import { asyncSearchServiceProvider } from './async_search_service';

export type PartialSearchRequest = IKibanaSearchRequest<SearchServiceParams>;
export type PartialSearchResponse = IKibanaSearchResponse<{
  values: SearchServiceValue[];
}>;

export const apmCorrelationsSearchStrategyProvider = (
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): ISearchStrategy<PartialSearchRequest, PartialSearchResponse> => {
  const asyncSearchServiceMap = new Map<
    string,
    ReturnType<typeof asyncSearchServiceProvider>
  >();

  return {
    search: (request, options, deps) => {
      if (request.params === undefined) {
        throw new Error('Invalid request parameters.');
      }

      // The function to fetch the current state of the async search service.
      // This will be either an existing service for a follow up fetch or a new one for new requests.
      let getAsyncSearchServiceState: ReturnType<
        typeof asyncSearchServiceProvider
      >;

      // If the request includes an ID, we require that the async search service already exists
      // otherwise we throw an error. The client should never poll a service that's been cancelled or finished.
      // This also avoids instantiating async search services when the service gets called with random IDs.
      if (typeof request.id === 'string') {
        const existingGetAsyncSearchServiceState = asyncSearchServiceMap.get(
          request.id
        );

        if (typeof existingGetAsyncSearchServiceState === 'undefined') {
          throw new Error(
            `AsyncSearchService with ID '${request.id}' does not exist.`
          );
        }

        getAsyncSearchServiceState = existingGetAsyncSearchServiceState;
      } else {
        getAsyncSearchServiceState = asyncSearchServiceProvider(
          deps.esClient.asCurrentUser,
          getApmIndices,
          request.params,
          includeFrozen
        );
      }

      // Reuse the request's id or create a new one.
      const id = request.id ?? uuid();

      const {
        ccsWarning,
        error,
        log,
        isRunning,
        loaded,
        started,
        total,
        values,
        percentileThresholdValue,
        overallHistogram,
      } = getAsyncSearchServiceState();

      if (error instanceof Error) {
        asyncSearchServiceMap.delete(id);
        throw error;
      } else if (isRunning) {
        asyncSearchServiceMap.set(id, getAsyncSearchServiceState);
      } else {
        asyncSearchServiceMap.delete(id);
      }

      const took = Date.now() - started;

      const rawResponse: SearchServiceRawResponse = {
        ccsWarning,
        log,
        took,
        values,
        percentileThresholdValue,
        overallHistogram,
      };

      return of({
        id,
        loaded,
        total,
        isRunning,
        isPartial: isRunning,
        rawResponse,
      });
    },
    cancel: async (id, options, deps) => {
      const getAsyncSearchServiceState = asyncSearchServiceMap.get(id);
      if (getAsyncSearchServiceState !== undefined) {
        getAsyncSearchServiceState().cancel();
        asyncSearchServiceMap.delete(id);
      }
    },
  };
};
