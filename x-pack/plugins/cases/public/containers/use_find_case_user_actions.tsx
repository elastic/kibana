/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { FindCaseUserActions, CaseUserActionTypeWithAll } from '../../common/ui/types';
import { findCaseUserActions } from './api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

export const useFindCaseUserActions = (
  caseId: string,
  params: {
    type: CaseUserActionTypeWithAll;
    sortOrder: 'asc' | 'desc';
  }
) => {
  const { showErrorToast } = useCasesToast();
  const abortCtrlRef = new AbortController();

  return useQuery<FindCaseUserActions, ServerError>(
    casesQueriesKeys.caseUserActions(caseId, params.type, params.sortOrder),
    async () => {
      return findCaseUserActions(caseId, params, abortCtrlRef.signal);
    },
    {
      onError: (error: ServerError) => {
        showErrorToast(error, { title: ERROR_TITLE });
      },
    }
  );
};

export type UseFindCaseUserActions = ReturnType<typeof useFindCaseUserActions>;
