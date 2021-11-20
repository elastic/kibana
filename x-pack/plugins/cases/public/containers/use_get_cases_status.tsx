/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';

import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getCasesStatus } from './api';
import * as i18n from './translations';
import { CasesStatus } from './types';
import { useToasts } from '../common/lib/kibana';

interface CasesStatusState extends CasesStatus {
  isLoading: boolean;
  isError: boolean;
}

const initialData: CasesStatusState = {
  countClosedCases: null,
  countInProgressCases: null,
  countOpenCases: null,
  isLoading: true,
  isError: false,
};

export interface UseGetCasesStatus extends CasesStatusState {
  fetchCasesStatus: () => void;
}

export const useGetCasesStatus = (): UseGetCasesStatus => {
  const { owner } = useCasesContext();
  const [casesStatusState, setCasesStatusState] = useState<CasesStatusState>(initialData);
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const fetchCasesStatus = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      setCasesStatusState({
        ...initialData,
        isLoading: true,
      });

      const response = await getCasesStatus(abortCtrlRef.current.signal, owner);

      if (!isCancelledRef.current) {
        setCasesStatusState({
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
        setCasesStatusState({
          countClosedCases: 0,
          countInProgressCases: 0,
          countOpenCases: 0,
          isLoading: false,
          isError: true,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCasesStatus();

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...casesStatusState,
    fetchCasesStatus,
  };
};
