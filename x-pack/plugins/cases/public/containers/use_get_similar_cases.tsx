/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { casesQueriesKeys } from './constants';
import type { CasesSimilarResponseUI } from './types';
import { useToasts } from '../common/lib/kibana';
import * as i18n from './translations';
import { getSimilarCases } from './api';
import type { ServerError } from '../types';

export const initialData: CasesSimilarResponseUI = {
  cases: [],
  page: 0,
  perPage: 0,
  total: 0,
};

export const useGetSimilarCases = (params: {
  caseId: string;
  perPage: number;
  page: number;
}): UseQueryResult<CasesSimilarResponseUI> => {
  const toasts = useToasts();

  return useQuery(
    casesQueriesKeys.similarCases(params.caseId, params),
    ({ signal }) => {
      return getSimilarCases({
        caseId: params.caseId,
        perPage: params.perPage,
        page: params.page,
        signal,
      });
    },
    {
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
      },
    }
  );
};
