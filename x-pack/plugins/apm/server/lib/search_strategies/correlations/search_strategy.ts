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
  SearchServiceValue,
} from '../../../../common/search_strategies/correlations/types';

import { asyncSearchServiceProvider } from './async_search_service';

export type PartialSearchRequest = IKibanaSearchRequest<SearchServiceParams>;
export type PartialSearchResponse = IKibanaSearchResponse<{
  values: SearchServiceValue[];
}>;

export const apmCorrelationsSearchStrategyProvider = (): ISearchStrategy<
  PartialSearchRequest,
  PartialSearchResponse
> => {
  const asyncSearchServiceMap = new Map<
    string,
    ReturnType<typeof asyncSearchServiceProvider>
  >();

  return {
    search: (request, options, deps) => {
      if (request.params === undefined) {
        throw new Error('Invalid request parameters.');
      }

      const id = request.id ?? uuid();

      const getAsyncSearchServiceState =
        asyncSearchServiceMap.get(id) ??
        asyncSearchServiceProvider(deps.esClient.asCurrentUser, request.params);

      const {
        error,
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

      return of({
        id,
        loaded,
        total,
        isRunning,
        isPartial: isRunning,
        rawResponse: {
          took,
          values,
          percentileThresholdValue,
          overallHistogram,
        },
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
