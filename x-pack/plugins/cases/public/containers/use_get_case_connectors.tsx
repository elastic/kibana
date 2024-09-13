/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import * as i18n from './translations';
import { getCaseConnectors } from './api';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';
import { useCasesToast } from '../common/use_cases_toast';
import type { CaseConnectors } from './types';

// 30 seconds
const STALE_TIME = 1000 * 30;

export const useGetCaseConnectors = (caseId: string) => {
  const { showErrorToast } = useCasesToast();

  return useQuery<CaseConnectors, ServerError>(
    casesQueriesKeys.caseConnectors(caseId),
    ({ signal }) => getCaseConnectors(caseId, signal),
    {
      staleTime: STALE_TIME,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseGetCaseConnectors = ReturnType<typeof useGetCaseConnectors>;
