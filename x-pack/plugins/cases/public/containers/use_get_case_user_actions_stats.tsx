/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { getCaseUserActionsStats } from './api';

import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

export const useGetCaseUserActionsStats = (caseId: string) => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.caseUserActionsStats(caseId),
    ({ signal }) => getCaseUserActionsStats(caseId, signal),
    {
      onError: (error: ServerError) => {
        showErrorToast(error, { title: ERROR_TITLE });
      },
    }
  );
};

export type UseGetCaseUserActionsStats = ReturnType<typeof useGetCaseUserActionsStats>;
