/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { getCasesStatus } from './api';
import * as i18n from './translations';
import { CasesStatus } from './types';

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
  const [casesStatusState, setCasesStatusState] = useState<CasesStatusState>(initialData);
  const [, dispatchToaster] = useStateToaster();
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  const fetchCasesStatus = useCallback(async () => {
    try {
      didCancel.current = false;
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();
      setCasesStatusState({
        ...initialData,
        isLoading: true,
      });

      const response = await getCasesStatus(abortCtrl.current.signal);

      if (!didCancel.current) {
        setCasesStatusState({
          ...response,
          isLoading: false,
          isError: false,
        });
      }
    } catch (error) {
      if (!didCancel.current) {
        if (error.name !== 'AbortError') {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
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
      didCancel.current = true;
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...casesStatusState,
    fetchCasesStatus,
  };
};
