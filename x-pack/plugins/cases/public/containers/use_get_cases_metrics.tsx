/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { CaseMetricsFeature } from '../../common/types/api';
import { getCasesMetrics } from '../api';
import { useHttp } from '../common/lib/kibana';
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';
import type { CasesMetrics } from './types';

export const useGetCasesMetrics = () => {
  const http = useHttp();
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();

  return useQuery<CasesMetrics, ServerError>(
    casesQueriesKeys.casesMetrics(),
    ({ signal }) =>
      getCasesMetrics({
        http,
        query: { owner, features: [CaseMetricsFeature.MTTR] },
        signal,
      }),
    {
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseGetCasesMetrics = ReturnType<typeof useGetCasesMetrics>;
