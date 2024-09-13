/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { casesQueriesKeys } from './constants';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { getCaseUsers } from './api';
import * as i18n from './translations';
import type { CaseUsers } from './types';

export const useGetCaseUsers = (caseId: string) => {
  const { showErrorToast } = useCasesToast();

  return useQuery<CaseUsers, ServerError>(
    casesQueriesKeys.caseUsers(caseId),
    ({ signal }) => getCaseUsers({ caseId, signal }),
    {
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseGetCaseUsers = ReturnType<typeof useGetCaseUsers>;
