/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';

import { useCasesContext } from '../components/cases_context/use_cases_context';
import * as i18n from './translations';
import { useHttp, useToasts } from '../common/lib/kibana';
import { getCasesMetrics } from '../api';
import { CasesMetrics } from './types';

interface CasesMetricsState extends CasesMetrics {
  isLoading: boolean;
  isError: boolean;
}

const initialData: CasesMetricsState = {
  mttr: 0,
  isLoading: true,
  isError: false,
};

export interface UseGetCasesMetrics extends CasesMetricsState {
  fetchCasesMetrics: () => void;
}

export const useGetCasesMetrics = (): UseGetCasesMetrics => {
  const http = useHttp();
  const { owner } = useCasesContext();
  const [casesMetricsState, setCasesMetricsState] = useState<CasesMetricsState>(initialData);
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const fetchCasesMetrics = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      setCasesMetricsState({
        ...initialData,
        isLoading: true,
      });

      const response = await getCasesMetrics({
        http,
        signal: abortCtrlRef.current.signal,
        query: { owner, features: ['mttr'] },
      });

      if (!isCancelledRef.current) {
        setCasesMetricsState({
          ...response,
          isLoading: false,
          isError: false,
        });
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
        setCasesMetricsState({
          mttr: 0,
          isLoading: false,
          isError: true,
        });
      }
    }
  }, [http, owner, toasts]);

  useEffect(() => {
    fetchCasesMetrics();

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
  }, [fetchCasesMetrics]);

  return {
    ...casesMetricsState,
    fetchCasesMetrics,
  };
};
