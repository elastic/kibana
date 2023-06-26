/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import * as i18n from './translations';
import type { CasesStatus } from './types';
import { useHttp } from '../common/lib/kibana';
import { getCasesStatus } from '../api';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';

export const useGetCasesStatus = () => {
  const http = useHttp();
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();

  return useQuery<CasesStatus, ServerError>(
    casesQueriesKeys.casesStatuses(),
    ({ signal }) =>
      getCasesStatus({
        http,
        query: { owner },
        signal,
      }),
    {
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseGetCasesStatus = ReturnType<typeof useGetCasesStatus>;
