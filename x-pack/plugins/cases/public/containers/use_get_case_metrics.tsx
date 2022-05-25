/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer, useCallback, useRef } from 'react';

import { useQuery } from 'react-query';
import { SingleCaseMetrics, SingleCaseMetricsFeature } from './types';
import * as i18n from './translations';
import { useToasts } from '../common/lib/kibana';
import { getSingleCaseMetrics } from './api';
import { ServerError } from '../types';
import { ERROR_TITLE } from './translations';
import { CASE_VIEW_CACHE_KEY } from './constants';

interface CaseMeticsState {
  metrics: SingleCaseMetrics | null;
  isLoading: boolean;
  isError: boolean;
}

type Action =
  | { type: 'FETCH_INIT'; payload: { silent: boolean } }
  | { type: 'FETCH_SUCCESS'; payload: SingleCaseMetrics }
  | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: CaseMeticsState, action: Action): CaseMeticsState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: !action.payload?.silent,
        isError: false,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        metrics: action.payload,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      return state;
  }
};

export interface UseGetCaseMetrics extends CaseMeticsState {
  /**
   * @param [silent] When set to `true`, the `isLoading` property will not be set to `true`
   * while doing the API call
   */
  fetchCaseMetrics: (silent?: boolean) => Promise<void>;
}

export const useFetchCaseMetrics = (caseId: string, features: SingleCaseMetricsFeature[]) => {
  const toasts = useToasts();
  const abortCtrlRef = new AbortController();
  return useQuery(
    [CASE_VIEW_CACHE_KEY, 'metrics', caseId, features],
    async () => {
      const response: SingleCaseMetrics = await getSingleCaseMetrics(
        caseId,
        features,
        abortCtrlRef.signal
      );
      return {
        metrics: response,
      };
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: ERROR_TITLE }
          );
        }
      },
    }
  );
};

export type UseFetchCasesMetrics = ReturnType<typeof useFetchCaseMetrics>;

export const useGetCaseMetrics = (
  caseId: string,
  features: SingleCaseMetricsFeature[]
): UseGetCaseMetrics => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    metrics: null,
    isLoading: false,
    isError: false,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const callFetch = useCallback(
    async (silent: boolean = false) => {
      if (features.length === 0) {
        return;
      }
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT', payload: { silent } });

        const response: SingleCaseMetrics = await getSingleCaseMetrics(
          caseId,
          features,
          abortCtrlRef.current.signal
        );

        if (!isCancelledRef.current) {
          dispatch({ type: 'FETCH_SUCCESS', payload: response });
        }
      } catch (error) {
        if (!isCancelledRef.current) {
          if (error.name !== 'AbortError') {
            toasts.addError(
              error.body && error.body.message ? new Error(error.body.message) : error,
              { title: i18n.ERROR_TITLE }
            );
          }
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    },
    [caseId, features, toasts]
  );

  useEffect(() => {
    callFetch();

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
  }, [callFetch]);

  return { ...state, fetchCaseMetrics: callFetch };
};
