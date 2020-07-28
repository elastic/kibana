/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';

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

  const fetchCasesStatus = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const fetchData = async () => {
      setCasesStatusState({
        ...casesStatusState,
        isLoading: true,
      });
      try {
        const response = await getCasesStatus(abortCtrl.signal);
        if (!didCancel) {
          setCasesStatusState({
            ...response,
            isLoading: false,
            isError: false,
          });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          setCasesStatusState({
            countClosedCases: 0,
            countOpenCases: 0,
            isLoading: false,
            isError: true,
          });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casesStatusState]);

  useEffect(() => {
    fetchCasesStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...casesStatusState,
    fetchCasesStatus,
  };
};
