/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';

import { isEmpty } from 'lodash/fp';
import { User } from '../../../../case/common/api';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { getReporters } from './api';
import * as i18n from './translations';

interface ReportersState {
  reporters: string[];
  respReporters: User[];
  isLoading: boolean;
  isError: boolean;
}

const initialData: ReportersState = {
  reporters: [],
  respReporters: [],
  isLoading: true,
  isError: false,
};

export interface UseGetReporters extends ReportersState {
  fetchReporters: () => void;
}

export const useGetReporters = (): UseGetReporters => {
  const [reportersState, setReporterState] = useState<ReportersState>(initialData);

  const [, dispatchToaster] = useStateToaster();

  const fetchReporters = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const fetchData = async () => {
      setReporterState({
        ...reportersState,
        isLoading: true,
      });
      try {
        const response = await getReporters(abortCtrl.signal);
        const myReporters = response
          .map((r) =>
            r.full_name == null || isEmpty(r.full_name) ? r.username ?? '' : r.full_name
          )
          .filter((u) => !isEmpty(u));
        if (!didCancel) {
          setReporterState({
            reporters: myReporters,
            respReporters: response,
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
          setReporterState({
            reporters: [],
            respReporters: [],
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
  }, [reportersState]);

  useEffect(() => {
    fetchReporters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ...reportersState, fetchReporters };
};
