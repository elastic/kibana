/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import type { InternalFindCaseUserActions, CaseUserActionTypeWithAll } from '../../common/ui/types';
import { findCaseUserActions } from './api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

export const useInfiniteFindCaseUserActions = (
  caseId: string,
  params: {
    type: CaseUserActionTypeWithAll;
    sortOrder: 'asc' | 'desc';
    perPage: number;
  },
  isEnabled: boolean
) => {
  const { showErrorToast } = useCasesToast();
  const abortCtrlRef = new AbortController();

  return useInfiniteQuery<InternalFindCaseUserActions, ServerError>(
    casesQueriesKeys.caseUserActions(caseId, params),
    async ({ pageParam = 1 }) => {
      return findCaseUserActions(caseId, { ...params, page: pageParam }, abortCtrlRef.signal);
    },
    {
      enabled: isEnabled,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: ERROR_TITLE });
      },
      getNextPageParam: (lastPage, pages) => {
        const lastPageNumber = Math.ceil(lastPage.total / lastPage.perPage);
        // here last page fetching is skipped because last page is fetched separately using useQuery hook
        if (lastPage.page < lastPageNumber - 1) {
          return lastPage.page + 1;
        }
        return undefined;
      },
    }
  );
};

export type UseInfiniteFindCaseUserActions = ReturnType<typeof useInfiniteFindCaseUserActions>;
