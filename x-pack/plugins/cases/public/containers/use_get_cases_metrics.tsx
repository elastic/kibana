/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import * as i18n from './translations';
import { useHttp } from '../common/lib/kibana';
import { getCasesMetrics } from '../api';
import type { CasesMetrics } from './types';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';

export const useGetCasesMetrics = () => {
  const http = useHttp();
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();

  return useQuery<CasesMetrics, ServerError>(
    casesQueriesKeys.casesMetrics(),
    () => {
      const abortCtrlRef = new AbortController();
      return getCasesMetrics({
        http,
        signal: abortCtrlRef.signal,
        query: { owner, features: ['mttr'] },
      });
    },
    {
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseGetCasesMetrics = ReturnType<typeof useGetCasesMetrics>;
