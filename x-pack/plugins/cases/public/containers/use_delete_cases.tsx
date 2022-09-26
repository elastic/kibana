/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as i18n from './translations';
import { deleteCases } from './api';
import { ServerError } from '../types';
import {
  CASE_LIST_CACHE_KEY,
  DELETE_CASES_CACHE_KEY,
  USER_PROFILES_BULK_GET_CACHE_KEY,
  USER_PROFILES_CACHE_KEY,
} from './constants';
import { useCasesToast } from '../common/use_cases_toast';

export const useDeleteCases = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation(
    (caseIds: string[]) => {
      const abortCtrlRef = new AbortController();
      return deleteCases(caseIds, abortCtrlRef.signal);
    },
    {
      mutationKey: [DELETE_CASES_CACHE_KEY],
      onSuccess: (_, caseIds) => {
        queryClient.invalidateQueries([CASE_LIST_CACHE_KEY]);
        queryClient.invalidateQueries([USER_PROFILES_CACHE_KEY, USER_PROFILES_BULK_GET_CACHE_KEY]);
        // TODO fix title
        showSuccessToast(i18n.DELETE_CASE(caseIds.length));
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_DELETING });
      },
    }
  );
};

export type UseDeleteCases = ReturnType<typeof useDeleteCases>;
